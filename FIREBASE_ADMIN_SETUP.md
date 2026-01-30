# Firebase Admin SDK Setup

This backend uses Firebase Admin to verify Google sign-in tokens and use Firebase services.

**Project ID:** `project-1013450031605`

## 1. Get a service account key

1. Go to [Firebase Console](https://console.firebase.google.com/) and select project **project-1013450031605** (or create/link it).
2. Open **Project settings** (gear) → **Service accounts**.
3. Click **Generate new private key** and download the JSON file.
4. Rename the file to `serviceAccountKey.json` and place it in the **project root** (same folder as `server.js`).

**Important:** Never commit `serviceAccountKey.json` to git. It is already listed in `.gitignore`.

## 2. Install and run

```bash
npm install
npm start
```

The server runs at `http://localhost:3000` and Firebase Admin is initialized on startup.

## 3. Verify Google ID tokens (optional)

From your frontend, after the user signs in with Google, you can send the credential (ID token) to your backend and verify it:

```javascript
// Backend (e.g. in an API route)
const { verifyIdToken } = require("./server");
const decoded = await verifyIdToken(idToken);
if (decoded) {
  // decoded.uid, decoded.email, decoded.name, etc.
}
```

Use the same Firebase project as your frontend Google Sign-In (same project as the OAuth Client ID in `google-auth-config.js`). For Firebase Auth, enable the "Google" sign-in provider in Authentication → Sign-in method.
