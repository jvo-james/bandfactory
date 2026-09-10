# Band Factory — Resend + Order Tracking setup

## Netlify environment variables

Required:

- `RESEND_API_KEY` — your Resend API key.

Recommended for live customer email delivery:

- `RESEND_FROM_EMAIL` — for example `Band Factory <orders@yourdomain.com>`. The domain/address must be verified in Resend. If omitted, the code falls back to `Band Factory <onboarding@resend.dev>` for initial testing; Resend restricts that testing sender, so verify a sending domain before launch.
- `RESEND_ADMIN_EMAIL` — optional. Defaults to `bandfactoryy@gmail.com`.

Your existing Firebase server variables are still required by the Netlify Functions:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Your existing Paystack variable remains required:

- `PAYSTACK_SECRET_KEY`

Netlify automatically supplies `URL` on production deploys. It is used to build the Track Order button in emails.

## Resend setup

1. Create/open your Resend account.
2. Add and verify the domain you want Band Factory emails to come from.
3. Create an API key and add it to Netlify as `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on that verified domain.
5. Redeploy the site so the functions receive the environment variables.

## What changed

- EmailJS is completely removed from browser code and HTML.
- Resend is called only from Netlify Functions, so the API key is never exposed to visitors.
- Purchase confirmation emails go to the customer and admin.
- Subscription emails go to the subscriber and admin.
- Contact form emails go to the customer and admin.
- Review submission emails go to the reviewer and admin.
- Order-status changes from the admin dashboard email the customer.
- Admin subscriber broadcasts and abandoned-cart recovery emails now use Resend.
- Public Track Order drawer is available across storefront pages; no customer account is required.
- Manual tracking accepts order number + checkout email, with a switch to checkout phone number.
- Email Track Order buttons use an opaque per-order token so they open the exact order directly without exposing the customer's email/phone in the URL.
- Existing/old paid orders are supported; tracking tokens are created lazily the first time an old order is tracked or receives a status update.

## Files to remove

No standalone file needs to be deleted. The old `email.js` filename remains, but its contents have been replaced with a small safe client that calls the new Netlify Functions. All EmailJS SDK script tags and EmailJS configuration values have been removed.

## Firestore

No new client-side Firestore permissions are required. Tracking and email-event records are accessed through Firebase Admin in Netlify Functions. The new `emailEvents` collection is server-only under your existing rules.

## Test checklist

- Place a paid test order and confirm both customer + admin emails arrive once.
- Submit a newsletter signup and confirm both emails.
- Submit a contact form and confirm acknowledgement + admin notification.
- Submit a review and confirm acknowledgement + admin notification.
- Change an order from Preparing → Ready → Dispatched → Delivered and verify each customer status email.
- Click Track Order in a status email and confirm the correct order opens immediately.
- Open Track Order manually and test order number + email.
- Toggle to phone lookup and test the same order with the checkout phone number.
- Test a pre-existing paid order to confirm old-order tracking works.
- Test on a narrow mobile screen and a desktop screen.
