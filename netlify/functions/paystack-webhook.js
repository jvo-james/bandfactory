const crypto = require('crypto');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(
        process.env.FIREBASE_PRIVATE_KEY || ''
      ).replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

const number = value => Number(value || 0);

const normalizePhone = value => {
  let digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length >= 10) {
    digits = '233' + digits.slice(1);
  }

  return digits;
};


// Find our Band Factory order ID inside Paystack metadata
function getOrderId(metadata) {
  if (!metadata) return '';

  // In case we later send order_id directly in metadata
  if (metadata.order_id) {
    return String(metadata.order_id).trim();
  }

  // Current checkout sends it as a custom field
  const fields = Array.isArray(metadata.custom_fields)
    ? metadata.custom_fields
    : [];

  const orderField = fields.find(field =>
    field?.variable_name === 'order_id'
  );

  return String(orderField?.value || '').trim();
}


exports.handler = async function(event) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {

    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error(
        '[Band Factory Webhook] PAYSTACK_SECRET_KEY is missing.'
      );

      return {
        statusCode: 500,
        body: 'Webhook not configured'
      };
    }


    // --------------------------------------------------
    // 1. VERIFY THAT THIS REQUEST REALLY CAME FROM PAYSTACK
    // --------------------------------------------------

    const signature =
      event.headers['x-paystack-signature'] ||
      event.headers['X-Paystack-Signature'] ||
      '';

    const hash = crypto
      .createHmac('sha512', secret)
      .update(event.body || '')
      .digest('hex');

    if (!signature || hash !== signature) {

      console.warn(
        '[Band Factory Webhook] Invalid Paystack signature.'
      );

      return {
        statusCode: 401,
        body: 'Invalid signature'
      };
    }


    // --------------------------------------------------
    // 2. READ THE PAYSTACK EVENT
    // --------------------------------------------------

    const payload = JSON.parse(event.body || '{}');

    // We only care about successful payments
    if (payload.event !== 'charge.success') {

      return {
        statusCode: 200,
        body: 'Event ignored'
      };
    }

    const payment = payload.data || {};

    if (payment.status !== 'success') {

      return {
        statusCode: 200,
        body: 'Payment not successful'
      };
    }


    // --------------------------------------------------
    // 3. FIND THE BAND FACTORY ORDER
    // --------------------------------------------------

    const reference = String(
      payment.reference || ''
    ).trim();

    const orderId = getOrderId(payment.metadata);

    if (!reference) {

      console.error(
        '[Band Factory Webhook] Successful payment has no reference.'
      );

      return {
        statusCode: 400,
        body: 'Missing payment reference'
      };
    }

    if (!orderId) {

      console.error(
        '[Band Factory Webhook] Could not find order ID in Paystack metadata.',
        reference
      );

      return {
        statusCode: 400,
        body: 'Missing order ID'
      };
    }


    const orderRef =
      db.collection('orders').doc(orderId);

    const paymentRef =
      db.collection('paymentReferences').doc(reference);

    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {

      console.error(
        `[Band Factory Webhook] Order ${orderId} does not exist.`
      );

      return {
        statusCode: 404,
        body: 'Order not found'
      };
    }

    const order = orderSnap.data() || {};


    // --------------------------------------------------
    // 4. CHECK THAT THE MONEY MATCHES THE ORDER
    // --------------------------------------------------

    const expectedAmount =
      Math.round(number(order.total) * 100);

    const paidAmount =
      number(payment.amount);

    const currency =
      String(payment.currency || '').toUpperCase();

    if (
      paidAmount !== expectedAmount ||
      currency !== 'GHS'
    ) {

      console.error(
        '[Band Factory Webhook] Payment does not match order.',
        {
          orderId,
          expectedAmount,
          paidAmount,
          currency
        }
      );

      return {
        statusCode: 400,
        body: 'Payment does not match order'
      };
    }


    // --------------------------------------------------
    // 5. MARK THE ORDER AS PAID
    // --------------------------------------------------

    await db.runTransaction(async transaction => {

      const existingPayment =
        await transaction.get(paymentRef);

      // Browser/server already processed this reference.
      // Don't create duplicates.
      if (existingPayment.exists) {
        return;
      }

      const latestOrderSnap =
        await transaction.get(orderRef);

      if (!latestOrderSnap.exists) {
        throw new Error('Order disappeared before finalisation.');
      }

      const latestOrder =
        latestOrderSnap.data() || {};

      const serverTime =
        admin.firestore.FieldValue.serverTimestamp();


      // Update the pending order
      transaction.set(
        orderRef,
        {
          payment: 'Paid',
          status: 'Preparing',

          paystackReference: reference,

          serverVerified: true,

          verification: {
            reference,
            amount: paidAmount,
            currency,
            paidAt: payment.paid_at || null,
            channel: payment.channel || ''
          },

          verifiedAt: serverTime,
          updatedAt: serverTime
        },
        {
          merge: true
        }
      );


      // Remember this Paystack reference so it
      // cannot be processed twice
      transaction.set(
        paymentRef,
        {
          orderId,
          amount: paidAmount,
          currency,
          createdAt: serverTime
        },
        {
          merge: false
        }
      );


      // Create customer record
      const customerRef =
        db.collection('customers').doc();

      transaction.set(customerRef, {
        name: latestOrder.name || '',
        email: latestOrder.email || '',
        phone: latestOrder.phone || '',

        normalizedPhone:
          normalizePhone(latestOrder.phone),

        orderId,

        total: number(latestOrder.total),

        type:
          latestOrder.type || 'Retail',

        city:
          latestOrder.city || '',

        region:
          latestOrder.region || '',

        country:
          latestOrder.country || '',

        countryCode:
          latestOrder.countryCode || '',

        source:
          latestOrder.source || 'Direct / Unknown',

        lastOrderAt: serverTime,
        createdAt: serverTime
      });


      // Create admin notification
      const notificationRef =
        db.collection('notifications').doc();

      transaction.set(notificationRef, {
        type: 'purchase',
        title: 'New paid order',

        message:
          `${latestOrder.name || 'Customer'} placed ` +
          `${orderId} for GHS ` +
          `${number(latestOrder.total).toFixed(2)}.`,

        orderId,

        read: false,
        createdAt: serverTime
      });


      // Activity log
      const activityRef =
        db.collection('activity').doc();

      transaction.set(activityRef, {
        action: 'Paid order created',
        orderId,

        total:
          number(latestOrder.total),

        paystackReference:
          reference,

        source:
          latestOrder.source ||
          'Direct / Unknown',

        createdAt:
          serverTime
      });


      // Mark abandoned cart as recovered
      if (latestOrder.abandonedCartId) {

        const abandonedRef =
          db.collection('abandonedCarts')
            .doc(latestOrder.abandonedCartId);

        transaction.set(
          abandonedRef,
          {
            status: 'recovered',
            orderId,
            recoveredAt: serverTime,
            updatedAt: serverTime
          },
          {
            merge: true
          }
        );
      }

    });


    console.log(
      `[Band Factory Webhook] ${orderId} successfully marked paid.`
    );


    // Paystack only needs a successful HTTP response
    return {
      statusCode: 200,
      body: 'Webhook received'
    };


  } catch (error) {

    console.error(
      '[Band Factory Webhook] Error:',
      error
    );

    return {
      statusCode: 500,
      body: 'Webhook processing failed'
    };
  }
};
