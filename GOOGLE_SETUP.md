# Google Sign-In Setup (Bar Chinesca Mxli)

Users can sign in with their Google account to make reservations. To enable this:

## 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.

## 2. Configure OAuth consent screen

1. Go to **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (or Internal if it’s only for your organization).
3. Fill in App name (e.g. "Bar Chinesca Mxli"), User support email, and Developer contact.
4. Add your domain under **Authorized domains** if you use a custom domain.
5. Save and continue (you can skip adding scopes for basic email/profile).

## 3. Create OAuth client ID

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: e.g. "Bar Chinesca Web".
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost` (for local testing)
   - `http://127.0.0.1`
   - Your live site, e.g. `https://yourdomain.com`
6. You can leave **Authorized redirect URIs** empty for the Google Sign-In button (One Tap / button flow).
7. Click **Create** and copy the **Client ID** (looks like `123456789-xxxx.apps.googleusercontent.com`).

## 4. Enable Google Identity Services (if needed)

- In **APIs & Services** → **Library**, search for **Google Identity Services** and enable it if required by your project.

## 5. Configure this app

1. Open **google-auth-config.js** in this project.
2. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID:

```javascript
const GOOGLE_AUTH_CONFIG = {
    clientId: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
    enabled: true
};
```

3. Save the file.

## 6. Test

1. Open the site (e.g. `index.html` via a local server or your deployed URL).
2. Click **Login** or **Sign up** to open the auth modal.
3. Use **Sign in with Google** and complete the flow.
4. After signing in, you can make reservations and use the profile page as usual.

## Notes

- The Google button appears in both the Login and Create Account views.
- Signing in with Google creates/updates the same `currentUser` used for reservations and profile.
- For local file testing (`file://`), Google Sign-In will not work; use a local server (e.g. `npx serve .`) or deploy to a host with `https`.
