// Reservation emails (confirmation + cancellation)
// ============================================
// Sent by a Google Apps Script web app running on the bar's Google account
// (source + setup: EMAIL_SETUP.md). The page sends only the customer's Firebase
// sign-in token and the order number; the script checks the token, reads the
// reservation from Firestore and emails the account's own address.
//
// webAppUrl: the deployed web app URL (https://script.google.com/macros/s/.../exec).
// Leave it empty ('') to turn reservation emails off (nothing is sent, no errors).
// ============================================

const EMAIL_CONFIG = {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbz2vDDoAvlk4UCTj9I8RPz9hWtTZbpAllBS_nxZzfgGiAGY9szDZcUxznN9UavH2jWi/exec'
};
