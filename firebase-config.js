// Firebase Configuration (for Authentication: Google + Email/Password)
// ============================================
// Project: bar-chinesca-mxli (the bar's own project, separate from eekseye.com)
// In Firebase Console: Authentication → Sign-in method, enable "Google" and "Email/Password"
// In Authentication → Settings → Authorized domains, add: localhost, barchinesca.club, www.barchinesca.club (plus eek-eye.github.io, eekseye.com, www.eekseye.com)
// (Live site: https://barchinesca.club/ — Google sign-in uses a popup, no OAuth client ID needed.)
// ============================================

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDWguLJhWpv9mRzO6tEdJjGrETpPjEZks4',
    authDomain: 'bar-chinesca-mxli.firebaseapp.com',
    projectId: 'bar-chinesca-mxli',
    storageBucket: 'bar-chinesca-mxli.firebasestorage.app',
    messagingSenderId: '177031938507',
    appId: '1:177031938507:web:62a7d75960e5ff4741f64e',
    enabled: true,
    // Facebook login: set to true only after Facebook is enabled in Firebase Console
    // (Authentication > Sign-in method > Facebook, with the Meta App ID + App Secret)
    facebookLogin: false
};
