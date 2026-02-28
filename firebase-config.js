// Firebase Configuration (for Authentication: Google + Email/Password)
// ============================================
// SETUP (required for "Continue with Google" to work):
// 1. Firebase Console (project-1013450031605) → Project settings (gear) → Your apps
// 2. Add app → Web (</>) → Register app → Copy the config object below
// 3. In Authentication → Sign-in method, enable "Google" and "Email/Password"
// 4. In Authentication → Settings → Authorized domains, add: localhost and your site URL
// 5. Replace YOUR_API_KEY, YOUR_APP_ID, etc. below with your app's config
// (Google sign-in uses redirect in this window—no popup—so it works even if popups are blocked.)
// ============================================

const FIREBASE_CONFIG = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'project-1013450031605.firebaseapp.com',
    projectId: 'project-1013450031605',
    storageBucket: 'project-1013450031605.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    enabled: true
};
