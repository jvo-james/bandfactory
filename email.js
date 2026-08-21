

const BFEmail = (() => {

  /* =======================================================
     CONFIG HELPERS
     ======================================================= */

  function getConfig() {
    /*
      Supports either:
      window.BF_CONFIG
      or
      window.CONFIG

      So the file is a little more flexible if your
      config object has a different global name.
    */
    return window.BF_CONFIG || window.CONFIG || {};
  }

  function getEmailConfig() {
    const config = getConfig();

    return config.emailjs || {};
  }

  function getSiteConfig() {
    const config = getConfig();

    return config.site || {};
  }

  function isConfigured() {
    const emailConfig = getEmailConfig();

    return Boolean(
      emailConfig.publicKey &&
      emailConfig.serviceId &&
      emailConfig.templates?.customer &&
      emailConfig.templates?.admin &&
      !String(emailConfig.publicKey).includes('REPLACE_') &&
      !String(emailConfig.serviceId).includes('REPLACE_') &&
      !String(emailConfig.templates.customer).includes('REPLACE_') &&
      !String(emailConfig.templates.admin).includes('REPLACE_')
    );
  }


  /* =======================================================
     GENERAL HELPERS
     ======================================================= */

  function clean(value, fallback = '') {
    if (value === undefined || value === null) return fallback;

    const string = String(value).trim();

    return string || fallback;
  }

  function formatMoney(value) {
    const amount = Number(value || 0);

    return `GHS ${amount.toLocaleString('en-GH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDateTime(value = new Date()) {
    const date = value instanceof Date
      ? value
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GH', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date);
  }

  function formatDate(value) {
    if (!value) return 'To be confirmed';

    const date = value instanceof Date
      ? value
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return clean(value, 'To be confirmed');
    }

    return new Intl.DateTimeFormat('en-GH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function safeURL(value, fallback = '') {
    const url = clean(value, fallback);

    if (!url) return '#';

    return url;
  }


  /* =======================================================
     CORE EMAILJS SEND FUNCTION
     ======================================================= */

  async function send(templateType, params) {
    if (!window.emailjs) {
      console.error(
        '[Band Factory Email] EmailJS SDK was not found.'
      );

      throw new Error(
        'Email service is unavailable. Please refresh the page and try again.'
      );
    }

    if (!isConfigured()) {
      console.warn(
        '[Band Factory Email] EmailJS has not been fully configured in config.js.'
      );

      /*
        During development we don't want the entire website
        to crash because EmailJS placeholders haven't been
        replaced yet.
      */
      return {
        skipped: true,
        reason: 'EmailJS is not configured.'
      };
    }

    const emailConfig = getEmailConfig();

    const templateId =
      templateType === 'admin'
        ? emailConfig.templates.admin
        : emailConfig.templates.customer;

    if (!templateId) {
      throw new Error(
        `Missing EmailJS ${templateType} template ID.`
      );
    }

    const finalParams = {
      ...params
    };

    try {
      const response = await window.emailjs.send(
        emailConfig.serviceId,
        templateId,
        finalParams,
        {
          publicKey: emailConfig.publicKey
        }
      );

      console.info(
        `[Band Factory Email] ${templateType} email sent successfully.`,
        response
      );

      return response;

    } catch (error) {
      console.error(
        `[Band Factory Email] Failed to send ${templateType} email.`,
        error
      );

      throw error;
    }
  }


  /* =======================================================
     CUSTOMER TEMPLATE
     -------------------------------------------------------
     EmailJS template variables expected:

     {{subject}}
     {{to_email}}
     {{to_name}}
     {{message}}
     {{details}}
     {{action_url}}
     {{action_text}}
     ======================================================= */

  async function sendCustomerEmail({
    toEmail,
    toName = 'there',
    subject,
    message,
    details = '',
    actionText = 'Visit Band Factory',
    actionUrl = ''
  }) {
    if (!toEmail) {
      throw new Error(
        'Customer email address is required.'
      );
    }

    const siteConfig = getSiteConfig();

    return send('customer', {
      to_email: clean(toEmail),
      to_name: clean(toName, 'there'),
      subject: clean(subject, 'Band Factory'),
      message: clean(message),
      details: clean(
        details,
        'Thank you for choosing Band Factory.'
      ),
      action_text: clean(
        actionText,
        'Visit Band Factory'
      ),
      action_url: safeURL(
        actionUrl,
        siteConfig.storeUrl ||
        siteConfig.websiteUrl ||
        window.location.origin
      )
    });
  }


  /* =======================================================
     ADMIN TEMPLATE
     -------------------------------------------------------
     EmailJS template variables expected:

     {{subject}}
     {{admin_email}}

     {{heading}}
     {{summary}}

     {{notification_title}}
     {{notification_subtitle}}

     {{customer_name}}
     {{customer_email}}
     {{customer_phone}}
     {{customer_city}}

     {{details}}

     {{amount_label}}
     {{amount}}
     {{status}}

     {{reference}}
     {{date_time}}

     {{admin_url}}
     ======================================================= */

  async function sendAdminEmail({
    subject,
    heading,
    summary,
    notificationTitle,
    notificationSubtitle,

    customerName = 'Not provided',
    customerEmail = 'Not provided',
    customerPhone = 'Not provided',
    customerCity = 'Not provided',

    details = '',

    amountLabel = 'Status',
    amount = 'New',
    status = 'New',

    reference = '-',
    dateTime = new Date(),

    adminUrl = ''
  }) {
    const config = getConfig();
    const emailConfig = getEmailConfig();
    const siteConfig = getSiteConfig();

    const adminEmail =
      emailConfig.adminEmail ||
      config.adminEmail ||
      siteConfig.adminEmail;

    if (!adminEmail) {
      throw new Error(
        'Admin email address is missing from config.js.'
      );
    }

    return send('admin', {
      admin_email: clean(adminEmail),

      subject: clean(
        subject,
        'New Band Factory Notification'
      ),

      heading: clean(
        heading,
        'New Notification'
      ),

      summary: clean(
        summary,
        'Something new has happened on the Band Factory website.'
      ),

      notification_title: clean(
        notificationTitle,
        'New Notification'
      ),

      notification_subtitle: clean(
        notificationSubtitle,
        'Open the Band Factory dashboard for more information.'
      ),

      customer_name: clean(
        customerName,
        'Not provided'
      ),

      customer_email: clean(
        customerEmail,
        'Not provided'
      ),

      customer_phone: clean(
        customerPhone,
        'Not provided'
      ),

      customer_city: clean(
        customerCity,
        'Not provided'
      ),

      details: clean(
        details,
        'No additional details were provided.'
      ),

      amount_label: clean(
        amountLabel,
        'Status'
      ),

      amount: clean(
        amount,
        'New'
      ),

      status: clean(
        status,
        'New'
      ),

      reference: clean(
        reference,
        '-'
      ),

      date_time: formatDateTime(dateTime),

      admin_url: safeURL(
        adminUrl,
        siteConfig.adminUrl ||
        `${window.location.origin}/admin.html`
      )
    });
  }


  /* =======================================================
     1. NEWSLETTER / EMAIL UPDATES
     -------------------------------------------------------
     Customer gets email.
     Admin DOES NOT get email.
     ======================================================= */

  async function sendNewsletterWelcome({
    email,
    name = 'there'
  }) {
    return sendCustomerEmail({
      toEmail: email,
      toName: name,

      subject:
        'Welcome to Band Factory 💗',

      message:
`You’re officially on the Band Factory list.

You’ll be among the first to hear about new colours, restocks, special drops, wholesale opportunities and updates from Band Factory.

We’re happy to have you here.`,

      details:
`Keep an eye on your inbox for Band Factory updates.

Wear it yourself. Sell it yourself. Build something with it.`,

      actionText:
        'Shop Hairbands',

      actionUrl:
        `${window.location.origin}/shop.html`
    });
  }


  /* =======================================================
     2. REVIEW - CUSTOMER ACKNOWLEDGEMENT
     -------------------------------------------------------
     Customer gets acknowledgement.
     ======================================================= */

  async function sendReviewCustomer({
    name,
    email,
    rating,
    review
  }) {
    const stars =
      '★'.repeat(Math.max(0, Math.min(5, Number(rating) || 0)));

    return sendCustomerEmail({
      toEmail: email,
      toName: name,

      subject:
        'We received your Band Factory review 💗',

      message:
`Thank you for taking the time to share your Band Factory experience.

Your review has been received and is currently awaiting approval. Once approved, it may appear on our website.`,

      details:
`Your rating:
${stars} ${rating}/5

Your review:
${review}`,

      actionText:
        'Continue Shopping',

      actionUrl:
        `${window.location.origin}/shop.html`
    });
  }


  /* =======================================================
     3. REVIEW - ADMIN NOTIFICATION
     -------------------------------------------------------
     Admin receives an email for every new review.
     ======================================================= */

  async function sendReviewAdmin({
    name,
    email,
    phone = '',
    city = '',
    rating,
    review,
    purchased = false,
    reviewId = '',
    createdAt = new Date()
  }) {
    const numericRating =
      Math.max(0, Math.min(5, Number(rating) || 0));

    const stars =
      '★'.repeat(numericRating) +
      '☆'.repeat(5 - numericRating);

    return sendAdminEmail({
      subject:
        `New ${numericRating}-Star Review - ${clean(name, 'Customer')}`,

      heading:
        'New Customer Review',

      summary:
        'A new customer review is waiting for your approval.',

      notificationTitle:
        `${numericRating}-Star Review`,

      notificationSubtitle:
        `${clean(name, 'A customer')} shared their Band Factory experience.`,

      customerName:
        name,

      customerEmail:
        email,

      customerPhone:
        phone || 'Not provided',

      customerCity:
        city || 'Not provided',

      details:
`REVIEW DETAILS

Rating:
${stars} (${numericRating}/5)

Review:
${clean(review, 'No written review was provided.')}

Purchased from Band Factory:
${purchased ? 'Yes' : 'No'}

Customer Name:
${clean(name, 'Not provided')}

Customer Email:
${clean(email, 'Not provided')}

Customer Phone:
${clean(phone, 'Not provided')}

City / Town:
${clean(city, 'Not provided')}

Review Status:
Pending approval`,

      amountLabel:
        'Rating',

      amount:
        `${numericRating} / 5`,

      status:
        'Pending Approval',

      reference:
        reviewId || `REVIEW-${Date.now()}`,

      dateTime:
        createdAt
    });
  }


  /* =======================================================
     ORDER ITEM FORMATTER
     ======================================================= */

  function buildOrderItems(order = {}) {
    const items =
      Array.isArray(order.items)
        ? order.items
        : Array.isArray(order.cart)
          ? order.cart
          : [];

    if (!items.length) {
      return 'No item details available.';
    }

    return items
      .map((item, index) => {
        const name =
          clean(
            item.name ||
            item.productName,
            'Smooth Hairband'
          );

        const qty =
          Number(item.qty || item.quantity || 1);

        const color =
          clean(
            item.color ||
            item.colour
          );

        const price =
          Number(item.price || 0);

        const lines = [
          `${index + 1}. ${name}`
        ];

        if (color) {
          lines.push(`Colour: ${color}`);
        }

        lines.push(`Quantity: ${qty}`);

        if (price) {
          lines.push(
            `Unit Price: ${formatMoney(price)}`
          );

          lines.push(
            `Line Total: ${formatMoney(price * qty)}`
          );
        }

        /*
          Wholesale bundle allocations may be stored in
          a number of different forms.
        */
        const allocations =
          item.allocations ||
          item.colors ||
          item.colours;

        if (allocations) {
          lines.push('');
          lines.push('Colour Allocation:');

          if (Array.isArray(allocations)) {
            allocations.forEach(allocation => {
              if (typeof allocation === 'string') {
                lines.push(`• ${allocation}`);
              } else {
                const allocationName =
                  allocation.name ||
                  allocation.color ||
                  allocation.colour ||
                  'Colour';

                const allocationQty =
                  allocation.qty ||
                  allocation.quantity ||
                  allocation.count ||
                  0;

                lines.push(
                  `• ${allocationName} - ${allocationQty} pieces`
                );
              }
            });
          } else if (
            typeof allocations === 'object'
          ) {
            Object.entries(allocations)
              .forEach(([allocationName, allocationQty]) => {
                if (Number(allocationQty) > 0) {
                  lines.push(
                    `• ${allocationName} - ${allocationQty} pieces`
                  );
                }
              });
          }
        }

        if (item.summary) {
          lines.push('');
          lines.push(clean(item.summary));
        }

        return lines.join('\n');
      })
      .join('\n\n');
  }


  /* =======================================================
     ORDER DETAILS FORMATTER
     ======================================================= */

  function buildFulfilmentDetails(order = {}) {
    const method =
      clean(
        order.fulfilmentMethod ||
        order.fulfillmentMethod ||
        order.deliveryMethod ||
        order.fulfilment ||
        order.fulfillment ||
        order.method,
        'Delivery'
      );

    const normalized =
      method.toLowerCase();

    const isPickup =
      normalized.includes('pickup') ||
      normalized.includes('pick-up');

    if (isPickup) {
      return [
        'FULFILMENT',
        '',
        'Method:',
        'Pickup',
        '',
        'Pickup Location:',
        clean(
          order.pickupAddress ||
          order.pickupLocation,
          'Band Factory pickup location'
        ),
        '',
        'Pickup Date:',
        formatDate(
          order.pickupDate ||
          order.fulfilmentDate ||
          order.fulfillmentDate
        ),
        '',
        'Pickup Notes:',
        clean(
          order.notes ||
          order.deliveryNotes ||
          order.customerNotes,
          'None'
        )
      ].join('\n');
    }

    return [
      'FULFILMENT',
      '',
      'Method:',
      'Delivery',
      '',
      'Scheduled Dispatch:',
      formatDate(
        order.dispatchDate ||
        order.deliveryDate ||
        order.fulfilmentDate ||
        order.fulfillmentDate
      ),
      '',
      'Country:',
      clean(order.country, 'Ghana'),
      '',
      'State / Region:',
      clean(
        order.region,
        'Not provided'
      ),
      '',
      'City / Town:',
      clean(
        order.city ||
        order.town,
        'Not provided'
      ),
      '',
      'Address Line 1:',
      clean(
        order.address ||
        order.deliveryAddress,
        'Not provided'
      ),
      '',
      'Address Line 2:',
      clean(order.address2, 'Not provided'),
      '',
      'Postal / ZIP Code:',
      clean(order.postalCode, 'Not provided'),
      '',
      'Landmark:',
      clean(
        order.landmark,
        'Not provided'
      ),
      '',
      'Delivery Notes:',
      clean(
        order.notes ||
        order.deliveryNotes ||
        order.customerNotes,
        'None'
      )
    ].join('\n');
  }


  /* =======================================================
     4. PURCHASE - CUSTOMER CONFIRMATION
     -------------------------------------------------------
     Call ONLY after successful Paystack payment.
     ======================================================= */

  async function sendPurchaseCustomer(order = {}) {
    const customer =
      order.customer || {};

    const name =
      clean(
        customer.name ||
        order.customerName ||
        order.name,
        'Customer'
      );

    const email =
      clean(
        customer.email ||
        order.customerEmail ||
        order.email
      );

    if (!email) {
      throw new Error(
        'Cannot send purchase confirmation because customer email is missing.'
      );
    }

    const reference =
      clean(
        order.reference ||
        order.orderReference ||
        order.orderId,
        `BF-${Date.now()}`
      );

    const paymentReference =
      clean(
        order.paymentReference ||
        order.paystackReference ||
        order.transactionReference,
        'Not available'
      );

    const subtotal =
      Number(order.subtotal || 0);

    const processingFee = Number(order.processingFee || 0);
    const hasDeliveryFee = order.deliveryFee !== null && order.deliveryFee !== undefined && order.deliveryFee !== '';
    const deliveryFee = hasDeliveryFee ? Number(order.deliveryFee) : null;

    const total =
      Number(
        order.total ||
        subtotal + processingFee + (deliveryFee || 0)
      );

    const items =
      buildOrderItems(order);

    const fulfilment =
      buildFulfilmentDetails(order);

    return sendCustomerEmail({
      toEmail: email,
      toName: name,

      subject:
        `Order ${reference} confirmed - Band Factory`,

      message:
`Your payment was successful and your Band Factory order has been received.

We’re getting everything ready for you.`,

      details:
`ORDER REFERENCE
${reference}

YOUR ORDER

${items}


${fulfilment}


PAYMENT

Payment Method:
Paystack

Payment Status:
Paid

Paystack Reference:
${paymentReference}

Subtotal:
${formatMoney(subtotal)}

Processing fee:
${formatMoney(processingFee)}

Delivery Fee:
${order.fulfilment === 'delivery' ? (deliveryFee === null ? 'To be communicated' : formatMoney(deliveryFee)) : 'Not applicable'}

TOTAL:
${formatMoney(total)}`,

      actionText:
        'Visit Band Factory',

      actionUrl:
        `${window.location.origin}/index.html`
    });
  }


  /* =======================================================
     5. PURCHASE - ADMIN NOTIFICATION
     -------------------------------------------------------
     Gives admin enough information to process the order
     directly from email.

     Call ONLY after successful Paystack payment.
     ======================================================= */

  async function sendPurchaseAdmin(order = {}) {
    const customer =
      order.customer || {};

    const customerName =
      clean(
        customer.name ||
        order.customerName ||
        order.name,
        'Not provided'
      );

    const customerEmail =
      clean(
        customer.email ||
        order.customerEmail ||
        order.email,
        'Not provided'
      );

    const customerPhone =
      clean(
        customer.phone ||
        order.customerPhone ||
        order.phone,
        'Not provided'
      );

    const customerCityBase =
      clean(
        customer.city ||
        order.city ||
        order.town,
        'Not provided'
      );

    const customerCity = order.country && order.country !== 'Ghana'
      ? `${customerCityBase}, ${clean(order.country)}`
      : customerCityBase;

    const reference =
      clean(
        order.reference ||
        order.orderReference ||
        order.orderId,
        `BF-${Date.now()}`
      );

    const paymentReference =
      clean(
        order.paymentReference ||
        order.paystackReference ||
        order.transactionReference,
        'Not available'
      );

    const orderType =
      clean(
        order.orderType ||
        order.type,
        'Retail'
      );

    const subtotal =
      Number(order.subtotal || 0);

    const processingFee = Number(order.processingFee || 0);
    const hasDeliveryFee = order.deliveryFee !== null && order.deliveryFee !== undefined && order.deliveryFee !== '';
    const deliveryFee = hasDeliveryFee ? Number(order.deliveryFee) : null;

    const total =
      Number(
        order.total ||
        subtotal + processingFee + (deliveryFee || 0)
      );

    const fulfilmentMethod =
      clean(
        order.fulfilmentMethod ||
        order.fulfillmentMethod ||
        order.deliveryMethod ||
        order.fulfilment ||
        order.fulfillment ||
        order.method,
        'Delivery'
      );

    const items =
      buildOrderItems(order);

    const fulfilment =
      buildFulfilmentDetails(order);

    const details =
`ORDER INFORMATION

Order Reference:
${reference}

Order Type:
${orderType}

ITEMS

${items}


${fulfilment}


CUSTOMER INFORMATION

Full Name:
${customerName}

Email:
${customerEmail}

Phone:
${customerPhone}

Region:
${clean(order.region, 'Not provided')}

City / Town:
${customerCity}

Address:
${clean(
  order.address ||
  order.deliveryAddress,
  'Not provided'
)}

Landmark:
${clean(order.landmark, 'Not provided')}

Customer Notes:
${clean(
  order.notes ||
  order.deliveryNotes ||
  order.customerNotes,
  'None'
)}


PAYMENT

Payment Method:
Paystack

Payment Status:
Paid

Paystack Reference:
${paymentReference}

Subtotal:
${formatMoney(subtotal)}

Processing fee:
${formatMoney(processingFee)}

Delivery Fee:
${order.fulfilment === 'delivery' ? (deliveryFee === null ? 'To be communicated' : formatMoney(deliveryFee)) : 'Not applicable'}

Grand Total:
${formatMoney(total)}`;

    return sendAdminEmail({
      subject:
        `New Paid Order ${reference} - ${formatMoney(total)}`,

      heading:
        'New Paid Order',

      summary:
        `${customerName} has successfully completed a Band Factory purchase.`,

      notificationTitle:
        `${orderType} Order · ${formatMoney(total)}`,

      notificationSubtitle:
        `${fulfilmentMethod} · Payment confirmed via Paystack`,

      customerName,
      customerEmail,
      customerPhone,
      customerCity,

      details,

      amountLabel:
        'Order Total',

      amount:
        formatMoney(total),

      status:
        'PAID',

      reference,

      dateTime:
        order.createdAt ||
        order.date ||
        new Date()
    });
  }


  /* =======================================================
     6. CONTACT FORM - CUSTOMER ACKNOWLEDGEMENT
     -------------------------------------------------------
     Admin DOES NOT receive an email here.
     Contact message itself should still be stored
     in Firebase/Admin Messages.
     ======================================================= */

  async function sendContactCustomer({
    name,
    email,
    message
  }) {
    return sendCustomerEmail({
      toEmail: email,
      toName: name,

      subject:
        'We received your message - Band Factory',

      message:
`Thanks for getting in touch with Band Factory.

Your message has been received successfully. We’ll get back to you as soon as possible.`,

      details:
`Your message:

${clean(message, 'No message content.')}`,

      actionText:
        'Visit Band Factory',

      actionUrl:
        `${window.location.origin}/index.html`
    });
  }


  /* =======================================================
     7. NEWSLETTER BROADCAST
     -------------------------------------------------------
     Sends ONE email to ONE subscriber.

     Your admin.js should call this repeatedly for the
     subscriber list, with a delay between sends.

     EmailJS documents a rate limit of 1 request/second.
     ======================================================= */

  async function sendBroadcastToSubscriber({
    email,
    name = 'there',
    subject,
    message
  }) {
    return sendCustomerEmail({
      toEmail: email,
      toName: name,

      subject:
        clean(subject, 'An update from Band Factory'),

      message:
        clean(message),

      details:
`You’re receiving this update because you joined the Band Factory mailing list.`,

      actionText:
        'Shop Band Factory',

      actionUrl:
        `${window.location.origin}/shop.html`
    });
  }


  /* =======================================================
     BULK NEWSLETTER SENDER
     -------------------------------------------------------
     Example:
     await BFEmail.sendBroadcast({
       subscribers,
       subject,
       message,
       onProgress: ({sent,total}) => {}
     });
     ======================================================= */

  async function sendBroadcast({
    subscribers = [],
    subject,
    message,
    onProgress = null
  }) {
    if (!Array.isArray(subscribers)) {
      throw new Error(
        'Subscribers must be an array.'
      );
    }

    const activeSubscribers =
      subscribers.filter(subscriber => {
        if (!subscriber) return false;

        const email =
          clean(
            subscriber.email ||
            subscriber.to_email
          );

        const active =
          subscriber.active !== false &&
          subscriber.status !== 'unsubscribed';

        return Boolean(email && active);
      });

    const results = [];

    for (
      let index = 0;
      index < activeSubscribers.length;
      index++
    ) {
      const subscriber =
        activeSubscribers[index];

      const email =
        clean(
          subscriber.email ||
          subscriber.to_email
        );

      const name =
        clean(
          subscriber.name ||
          subscriber.firstName,
          'there'
        );

      try {
        const result =
          await sendBroadcastToSubscriber({
            email,
            name,
            subject,
            message
          });

        results.push({
          email,
          success: true,
          result
        });

      } catch (error) {
        results.push({
          email,
          success: false,
          error
        });
      }

      if (
        typeof onProgress === 'function'
      ) {
        onProgress({
          sent: index + 1,
          total: activeSubscribers.length,
          currentEmail: email,
          result:
            results[results.length - 1]
        });
      }

      /*
        EmailJS currently documents a rate limit
        of 1 request per second.

        Waiting 1.1 seconds keeps broadcasts from
        firing requests too quickly.
      */
      if (
        index <
        activeSubscribers.length - 1
      ) {
        await new Promise(resolve =>
          setTimeout(resolve, 1100)
        );
      }
    }

    return {
      total: activeSubscribers.length,
      successful:
        results.filter(item => item.success).length,
      failed:
        results.filter(item => !item.success).length,
      results
    };
  }


  /* =======================================================
     CONVENIENCE: SEND BOTH PURCHASE EMAILS
     -------------------------------------------------------
     Use this AFTER a successful payment and AFTER you've
     prepared the complete order object.

     Customer email failure will not prevent us from
     attempting the admin email, and vice versa.
     ======================================================= */

  async function sendPurchaseEmails(order) {
    let customerResult = null;
    let adminResult = null;

    if (clean(order?.customer?.email || order?.customerEmail || order?.email)) {
      try {
        customerResult = await sendPurchaseCustomer(order);
      } catch (error) {
        console.error(
          '[Band Factory Email] Customer purchase email failed:',
          error
        );
      }

      // EmailJS limits send requests to roughly 1 request/second.
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    try {
      adminResult = await sendPurchaseAdmin(order);
    } catch (error) {
      console.error(
        '[Band Factory Email] Admin purchase email failed:',
        error
      );
    }

    return {
      customer: customerResult,
      admin: adminResult,
      success: Boolean(customerResult || adminResult)
    };
  }


  /* =======================================================
     CONVENIENCE: SEND BOTH REVIEW EMAILS
     ======================================================= */

  async function sendReviewEmails(reviewData) {
    /*
      EmailJS limits requests to approximately
      one request per second.

      Therefore:
      customer email first,
      brief wait,
      admin email second.
    */

    let customerResult = null;
    let adminResult = null;

    try {
      customerResult =
        await sendReviewCustomer(reviewData);
    } catch (error) {
      console.error(
        '[Band Factory Email] Review acknowledgement failed:',
        error
      );
    }

    await new Promise(resolve =>
      setTimeout(resolve, 1100)
    );

    try {
      adminResult =
        await sendReviewAdmin(reviewData);
    } catch (error) {
      console.error(
        '[Band Factory Email] Admin review notification failed:',
        error
      );
    }

    return {
      customer: customerResult,
      admin: adminResult
    };
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  return {
    isConfigured,

    sendCustomerEmail,
    sendAdminEmail,

    sendNewsletterWelcome,

    sendReviewCustomer,
    sendReviewAdmin,
    sendReviewEmails,

    sendPurchaseCustomer,
    sendPurchaseAdmin,
    sendPurchaseEmails,

    sendContactCustomer,

    sendBroadcastToSubscriber,
    sendBroadcast,

    formatMoney,
    formatDate,
    formatDateTime
  };

})();


/* =========================================================
   MAKE EMAIL SERVICE AVAILABLE GLOBALLY

   Other files can now call:

   BFEmail.sendNewsletterWelcome(...)
   BFEmail.sendReviewEmails(...)
   BFEmail.sendPurchaseEmails(...)
   BFEmail.sendContactCustomer(...)
   BFEmail.sendBroadcast(...)
   ========================================================= */

window.BFEmail = BFEmail;
