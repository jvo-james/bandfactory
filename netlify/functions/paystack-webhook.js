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


function getOrderId(metadata) {
  if (!metadata) return '';

  if (metadata.order_id) {
    return String(metadata.order_id).trim();
  }

  const fields = Array.isArray(metadata.custom_fields)
    ? metadata.custom_fields
    : [];

  const orderField = fields.find(
    field => field?.variable_name === 'order_id'
  );

  return String(orderField?.value || '').trim();
}


function calculateStockDeductions(order) {

  const deductions = {
    flat: {},
    twisted: {}
  };

  let unallocatedWholesale = 0;

  const add = (style, color, qty) => {

    style = String(style || 'flat').toLowerCase();
    qty = number(qty);

    if (
      !['flat', 'twisted'].includes(style) ||
      !color ||
      qty <= 0
    ) {
      return;
    }

    deductions[style][color] =
      (deductions[style][color] || 0) + qty;
  };


  for (const item of order.items || []) {

    const multiplier = number(item.qty || 1);


    // Retail smooth hairbands
    if (
      item.type === 'retail' &&
      (item.material || 'smooth') === 'smooth'
    ) {
      add(
        item.style || 'flat',
        item.color,
        number(item.qty)
      );
    }


    // Custom wholesale smooth hairbands
    if (
      item.type === 'wholesale' &&
      (item.material || 'smooth') === 'smooth'
    ) {

      if (
        item.wholesaleMode === 'custom' &&
        item.allocations
      ) {

        if (item.style === 'mixed') {

          for (
            const [style, colors]
            of Object.entries(item.allocations || {})
          ) {

            for (
              const [color, qty]
              of Object.entries(colors || {})
            ) {

              add(
                style,
                color,
                number(qty) * multiplier
              );
            }
          }

        } else {

          for (
            const [color, qty]
            of Object.entries(item.allocations || {})
          ) {

            add(
              item.style || 'flat',
              color,
              number(qty) * multiplier
            );
          }
        }

      } else {

        // Standard wholesale mixes cannot be allocated
        // reliably to individual colours automatically.
        unallocatedWholesale +=
          number(item.bundlePieces) * multiplier;
      }
    }
  }


  return {
    deductions,
    unallocatedWholesale
  };
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


    // -------------------------------------------
    // VERIFY PAYSTACK SIGNATURE
    // -------------------------------------------

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


    // -------------------------------------------
    // READ EVENT
    // -------------------------------------------

    const payload = JSON.parse(event.body || '{}');

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


    const reference =
      String(payment.reference || '').trim();

    const orderId =
      getOrderId(payment.metadata);


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
        '[Band Factory Webhook] Could not find order ID.',
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

    const productRef =
      db.doc('products/smooth');


    const orderSnap =
      await orderRef.get();

    if (!orderSnap.exists) {

      console.error(
        `[Band Factory Webhook] Order ${orderId} does not exist.`
      );

      return {
        statusCode: 404,
        body: 'Order not found'
      };
    }


    const order =
      orderSnap.data() || {};


    // -------------------------------------------
    // VERIFY AMOUNT
    // -------------------------------------------

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


    // -------------------------------------------
    // CALCULATE INVENTORY
    // -------------------------------------------

    const {
      deductions,
      unallocatedWholesale
    } = calculateStockDeductions(order);


    const hasManagedStock =
      Object.values(deductions.flat).some(Boolean) ||
      Object.values(deductions.twisted).some(Boolean);


    // -------------------------------------------
    // FINALISE PAYMENT
    // -------------------------------------------

    await db.runTransaction(async transaction => {

      const seen =
        await transaction.get(paymentRef);


      // Another trusted server path already handled it.
      if (seen.exists) {
        return;
      }


      const latestOrderSnap =
        await transaction.get(orderRef);

      if (!latestOrderSnap.exists) {
        throw new Error(
          'Order disappeared before finalisation.'
        );
      }


      const latestOrder =
        latestOrderSnap.data() || {};


      let productSnap = null;
      let styles = null;

      let stockSyncStatus = 'not-required';

      const shortages = [];


      if (hasManagedStock) {
        productSnap =
          await transaction.get(productRef);
      }


      if (
        hasManagedStock &&
        productSnap?.exists
      ) {

        const product =
          productSnap.data() || {};

        styles =
          JSON.parse(
            JSON.stringify(product.styles || {})
          );


        for (const style of ['flat', 'twisted']) {

          for (
            const [color, qty]
            of Object.entries(deductions[style])
          ) {

            styles[style] ||= {
              colors: {}
            };

            styles[style].colors ||= {};


            const current =
              styles[style].colors[color] ||
              product.colors?.[color] ||
              {};


            const currentStock =
              number(current.stock);


            if (currentStock < qty) {

              shortages.push(
                `${color} ${style}: ordered ${qty}, recorded ${currentStock}`
              );
            }


            styles[style].colors[color] = {
              ...current,
              stock:
                Math.max(
                  0,
                  currentStock - qty
                )
            };
          }
        }


        stockSyncStatus = 'updated';

      } else if (hasManagedStock) {

        stockSyncStatus = 'needs-review';
      }


      const serverTime =
        admin.firestore.FieldValue.serverTimestamp();


      // Update order
      transaction.set(
        orderRef,
        {
          payment: 'Paid',
          status: 'Preparing',

          paystackReference:
            reference,

          serverVerified:
            true,

          stockSyncStatus,

          verification: {
            reference,
            amount: paidAmount,
            currency,
            paidAt:
              payment.paid_at || null,
            channel:
              payment.channel || ''
          },

          verifiedAt:
            serverTime,

          updatedAt:
            serverTime
        },
        {
          merge: true
        }
      );


      // Save updated inventory
      if (styles) {

        transaction.set(
          productRef,
          {
            styles,
            updatedAt: serverTime
          },
          {
            merge: true
          }
        );
      }


      // Mark reference as processed
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


      // Customer
      const customerRef =
        db.collection('customers').doc();

      transaction.set(
        customerRef,
        {
          name:
            latestOrder.name || '',

          email:
            latestOrder.email || '',

          phone:
            latestOrder.phone || '',

          normalizedPhone:
            normalizePhone(latestOrder.phone),

          orderId,

          total:
            number(latestOrder.total),

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
            latestOrder.source ||
            'Direct / Unknown',

          lastOrderAt:
            serverTime,

          createdAt:
            serverTime
        }
      );


      // Purchase notification
      const notificationRef =
        db.collection('notifications').doc();

      transaction.set(
        notificationRef,
        {
          type: 'purchase',

          title:
            'New paid order',

          message:
            `${latestOrder.name || 'Customer'} placed ` +
            `${orderId} for GHS ` +
            `${number(latestOrder.total).toFixed(2)}.`,

          orderId,

          read: false,

          createdAt:
            serverTime
        }
      );


      // Activity
      const activityRef =
        db.collection('activity').doc();

      transaction.set(
        activityRef,
        {
          action:
            'Paid order created',

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
        }
      );


      // Recover abandoned cart
      if (latestOrder.abandonedCartId) {

        const abandonedRef =
          db.collection('abandonedCarts')
            .doc(latestOrder.abandonedCartId);

        transaction.set(
          abandonedRef,
          {
            status:
              'recovered',

            orderId,

            recoveredAt:
              serverTime,

            updatedAt:
              serverTime
          },
          {
            merge: true
          }
        );
      }


      // Wholesale that cannot be automatically
      // assigned to specific colours
      if (unallocatedWholesale > 0) {

        const inventoryNotification =
          db.collection('notifications').doc();

        transaction.set(
          inventoryNotification,
          {
            type:
              'inventory',

            title:
              'Wholesale stock needs a quick check',

            message:
              `${unallocatedWholesale} standard-mix wholesale pieces ` +
              `from ${orderId} need to be deducted from the ` +
              `colours actually packed.`,

            orderId,

            read:
              false,

            createdAt:
              serverTime
          }
        );
      }


      // Inventory database missing
      if (
        hasManagedStock &&
        !productSnap?.exists
      ) {

        const warningRef =
          db.collection('notifications').doc();

        transaction.set(
          warningRef,
          {
            type:
              'inventory',

            title:
              'Please check this order and stock',

            message:
              `${orderId} was paid successfully, but the ` +
              `inventory list could not be found.`,

            orderId,

            read:
              false,

            createdAt:
              serverTime
          }
        );
      }


      // Oversold inventory warning
      else if (shortages.length) {

        const warningRef =
          db.collection('notifications').doc();

        transaction.set(
          warningRef,
          {
            type:
              'inventory',

            title:
              'Please check these stock counts',

            message:
              `${orderId} used more stock than the saved ` +
              `count showed: ${shortages.join('; ')}. ` +
              `The affected colours were set to zero.`,

            orderId,

            read:
              false,

            createdAt:
              serverTime
          }
        );
      }

    });


    console.log(
      `[Band Factory Webhook] ${orderId} successfully marked paid and inventory processed.`
    );


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
