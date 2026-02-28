// Google Sign-In Configuration
// ============================================
// SETUP INSTRUCTIONS:
// 1. Go to https://console.cloud.google.com/
// 2. Create a project or select one
// 3. Enable "Google Identity Services" (APIs & Services > Library > search "Google Identity")
// 4. Go to APIs & Services > Credentials > Create Credentials > OAuth client ID
// 5. Application type: Web application
// 6. Add your site to "Authorized JavaScript origins" (e.g. http://localhost, https://yoursite.com)
// 7. Copy the Client ID and paste it below
// ============================================

const GOOGLE_AUTH_CONFIG = {
    // Google Cloud / Firebase project ID (for reference)
    projectId: 'project-1013450031605',
    // Your Google OAuth 2.0 Client ID (Web application) – from this project in Cloud Console
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    enabled: true
};
