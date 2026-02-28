// EmailJS Configuration
// ============================================
// SETUP INSTRUCTIONS:
// 1. Go to https://www.emailjs.com/ and sign up (free)
// 2. Create an Email Service (Gmail/Outlook/etc.) - get Service ID
// 3. Create an Email Template - get Template ID  
// 4. Get your Public Key from Account > API Keys
// 5. Replace the values below with your actual credentials
// ============================================

const EMAIL_CONFIG = {
    // Your EmailJS Public Key
    // Found in: EmailJS Dashboard > Account > General > API Keys
    publicKey: 'YOUR_PUBLIC_KEY',
    
    // Your EmailJS Service ID
    // Found in: EmailJS Dashboard > Email Services > Your Service
    serviceID: 'YOUR_SERVICE_ID',
    
    // Your EmailJS Template ID
    // Found in: EmailJS Dashboard > Email Templates > Your Template
    templateID: 'YOUR_TEMPLATE_ID',
    
    // Enable/disable email sending
    enabled: true
};

// Initialize EmailJS when config is loaded
if (typeof emailjs !== 'undefined' && EMAIL_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAIL_CONFIG.publicKey);
    console.log('✅ EmailJS initialized');
} else if (EMAIL_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
    console.log('⚠️ EmailJS not configured. Update email-config.js with your credentials.');
}
