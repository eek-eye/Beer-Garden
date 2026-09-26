// Firebase Configuration (for Authentication: Google + Email/Password)
// ============================================
// Project: bar-chinesca
// In Firebase Console: Authentication → Sign-in method, enable "Google" and "Email/Password"
// In Authentication → Settings → Authorized domains, add: localhost, eekseye.com, www.eekseye.com, eek-eye.github.io
// (Live site: https://eekseye.com/Beer-Garden/ — Google sign-in uses a popup, no OAuth client ID needed.)
// ============================================

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBtupezNAWSq49UkTUv60soL8I2K24nr2M',
    authDomain: 'bar-chinesca.firebaseapp.com',
    projectId: 'bar-chinesca',
    storageBucket: 'bar-chinesca.firebasestorage.app',
    messagingSenderId: '1013450031605',
    appId: '1:1013450031605:web:20f8cfb9558066c39920bc',
    measurementId: 'G-KK65VHTHSX',
    enabled: true
};
