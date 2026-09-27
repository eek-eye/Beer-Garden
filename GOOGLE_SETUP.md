# Google Sign-In Setup (Bar Chinesca Mxli)

"Continue with Google" uses **Firebase Authentication** (project `bar-chinesca-mxli`).
No separate Google OAuth client ID is needed – Firebase provides it.

## How it works

- `firebase-config.js` holds the Firebase web config (the apiKey is public by design).
- Clicking **Continue with Google** opens Google's account picker in a popup
  (`signInWithPopup`). If the browser blocks the popup, it falls back to a full-page redirect.
- After sign-in, the site stores `currentUser` (first/last name, email, photo from the
  Google account) so reservations and the profile page work as before.
- **Logout** on the profile page signs out of Firebase and clears the local session.

## Firebase Console checklist (https://console.firebase.google.com/project/bar-chinesca-mxli)

1. **Authentication → Sign-in method** → **Google** = Enabled (also Email/Password).
2. **Authentication → Settings → Authorized domains** must list every hostname the site is opened on:
   - `localhost` (local testing)
   - `barchinesca.club` and `www.barchinesca.club` (live site: https://barchinesca.club/)
   - `eek-eye.github.io`, `eekseye.com`, `www.eekseye.com` (old addresses; they redirect to barchinesca.club)
   Hostname only – no `https://`, no path.

3. **Firestore Database** (default, nam5) holds the reservations; its **Rules** tab must contain
   `firestore.rules` from this repo.

If a domain is missing, clicking the button shows an "auth/unauthorized-domain" message.

## Local testing

Serve the folder over http (not `file://`), e.g. `npx serve .` or `python -m http.server`,
then open `http://localhost:<port>/`.
