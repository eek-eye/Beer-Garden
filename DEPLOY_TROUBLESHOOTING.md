# Troubleshooting: Can't Log In on Published Site (Cloudflare Pages + Firebase)

If you added your domain to Firebase but still can't log in, check these:

**Firebase project for this site:** `bar-chinesca-mxli` (https://console.firebase.google.com/project/bar-chinesca-mxli). Its web config is in `firebase-config.js`.

---

## 1. **Firebase config must use REAL values on the live site**

Your **published** site (the Cloudflare Pages deployment of `public/`) must load a `firebase-config.js` that has your **actual** Firebase keys, not placeholders.

- If the file still has `YOUR_API_KEY`, `YOUR_APP_ID`, etc., Firebase never starts and login will not work.
- **Fix:** In `firebase-config.js`, replace every placeholder with the values from Firebase Console → Project settings → Your apps → Web app config.
- Then commit and push to GitHub so the **deployed** site uses that file.

*(Firebase client API keys are meant to be public; security is enforced by Authorized domains in Firebase.)*

---

## 2. **Authorized domain must match exactly**

In Firebase: **Authentication → Settings → Authorized domains**.

- The site is live at **`barchinesca.club`**, served by Cloudflare Pages from the `public/` folder of this repo, so **`barchinesca.club`** and **`www.barchinesca.club`** must be in the list.
- Add hostnames only: no `https://`, no path, no trailing slash.
- Every preview deployment gets its own hostname (e.g. `abc123.bar-site.pages.dev`); Google sign-in fails there with `auth/unauthorized-domain` until that hostname is added too.

---

## 3. **Check the browser on the live site**

1. Open your **published** site (https://barchinesca.club/).
2. Open **Developer Tools** (F12 or right‑click → Inspect) → **Console** tab.
3. Click **Continue with Google** and watch for red errors.

Common messages:
- **"Firebase: Error (auth/unauthorized-domain)"** → This URL is not in Authorized domains. Add the exact hostname (e.g. `yourusername.github.io`) in Firebase.
- **"Firebase: No Firebase App"** or nothing happens when you click → Firebase config is missing or still has placeholders. Update `firebase-config.js` and redeploy.

---

## 4. **After clicking Continue with Google**

- You should be sent to Google to choose an account, then back to your site.
- If you come back but are not logged in, stay on that same tab and check the Console for errors when the page loads.
- Try in an **incognito/private** window in case an old session or cache is affecting login.

---

## 5. **Quick checklist**

- [ ] `firebase-config.js` on the **deployed** site has real `apiKey`, `appId`, etc. (not `YOUR_...`).
- [ ] In Firebase, **Authentication → Sign-in method**, **Google** is enabled.
- [ ] In Firebase, **Authentication → Authorized domains**, the **exact** hostname of your live site is added (e.g. `barchinesca.club`).
- [ ] You are testing on the **real** URL (e.g. `https://barchinesca.club/`), not `file://` or a different domain.

Once the deployed site has the real config and the correct domain is in Firebase, login should work.
