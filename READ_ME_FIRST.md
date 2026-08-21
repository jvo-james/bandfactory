# Band Factory — Netlify-ready build

This is the complete site repository. Deploy this folder/repository directly to Netlify.

## What changed in this build

- Netlify Function replaces the old Firebase Functions / Google Cloud backend.
- Paystack transaction verification runs at `/.netlify/functions/verify-payment`.
- The only payment secret you add in Netlify is `PAYSTACK_SECRET_KEY`.
- Paid orders are verified before the normal storefront syncs the order, customer, notifications and managed stock to Firestore.
- Automatic stock deduction remains enabled for retail products and custom-colour wholesale orders.
- Standard wholesale mixes create an admin inventory notification because the exact colours are chosen while packing.
- Admin analytics, customer history, returning-customer status, acquisition source, abandoned carts and notification counts remain included.
- The Website Content tab is removed from admin.
- "Powered by JVO_JAMES" is removed from all public pages.
- The homepage hero now positions Band Factory as a broader essentials brand, while making clear that hairbands are the current signature product.
- The client-supplied black and pink identity images are included in `images/`.
- Displayed Band Factory wordmarks use a light, spaced treatment inspired by the supplied logo, with an uncrossed A (`Λ`).

## Do these two setup steps after Netlify deploy

### 1. Add your Paystack secret in Netlify

Netlify dashboard → your site → Project configuration → Environment variables → Add variable

Name it exactly:

`PAYSTACK_SECRET_KEY`

Paste the Paystack secret key that matches the public key in `config.js`. Do not put the secret in GitHub or any `.js` file.

After saving the variable, trigger a new Netlify deploy.

### 2. Publish the included Firestore rules

Firebase Console → Firestore Database → Rules.

Copy everything from `FIRESTORE_RULES.txt`, paste it into the Rules editor, then click **Publish**.

No Firebase Functions deployment is needed for this Netlify build.

## Test before taking real orders

Make one complete test order and confirm:

1. Paystack opens and payment succeeds.
2. The confirmation page appears.
3. The order appears in Admin → Orders.
4. Revenue/analytics update.
5. The customer appears under Customers.
6. Stock decreases for the exact retail/custom colours bought.
7. The admin bell shows a new notification count.
8. A second order with the same phone number is shown as a returning customer.

If you use a Paystack live public key in `config.js`, use the matching live secret in Netlify. If you switch to test mode, switch both keys together.
