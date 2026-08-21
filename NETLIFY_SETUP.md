# Netlify setup — no terminal required

## A. Connect/deploy the GitHub repository

1. In Netlify, choose **Add new project** / **Import an existing project**.
2. Choose GitHub and select the Band Factory repository.
3. The included `netlify.toml` already tells Netlify to publish the repository root and deploy `netlify/functions`.
4. Deploy the site.

## B. Add the Paystack secret key

1. Open the deployed site in Netlify.
2. Go to **Project configuration → Environment variables**.
3. Add a variable named exactly `PAYSTACK_SECRET_KEY`.
4. Paste the Paystack secret key as the value.
5. Save.
6. Go to **Deploys** and trigger a fresh deploy.

Never commit the Paystack secret to GitHub.

## C. Publish Firestore rules manually

1. Open Firebase Console.
2. Open the `band-factory` project.
3. Go to **Firestore Database → Rules**.
4. Open `FIRESTORE_RULES.txt` from this repo.
5. Copy all of it into Firebase's Rules editor.
6. Click **Publish**.

## D. Admin login

Admin users are still managed with Firebase Authentication plus an `admins/{uid}` document in Firestore. Existing admin accounts continue to work.

## E. Quick function check

After redeploying, visit your normal checkout and make a Paystack test transaction. The checkout calls the Netlify Function automatically; there is no function URL to paste anywhere because `config.js` uses the relative Netlify path.
