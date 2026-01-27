# Email Setup Instructions

## Quick Setup Guide

1. **Sign up for EmailJS** (Free account)
   - Go to https://www.emailjs.com/
   - Create a free account

2. **Create an Email Service**
   - Go to "Email Services" in your EmailJS dashboard
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the connection steps
   - **Copy your Service ID** (e.g., `service_abc123`)

3. **Create an Email Template**
   - Go to "Email Templates" in your EmailJS dashboard
   - Click "Create New Template"
   - Use this template:

```
Subject: Your Reservation Order Number - Bar Chinesca Mxli

Hello {{to_name}},

Thank you for your reservation at Bar Chinesca Mxli!

Your Order Number: {{order_number}}

Reservation Details:
- Date: {{reservation_date}}
- Time: {{reservation_time}}
- Table: {{table_number}}
- Guests: {{number_of_guests}}

Please save your order number ({{order_number}}) as you'll need it to cancel your reservation if needed.

We look forward to seeing you!

Bar Chinesca Mxli
```

   - **Copy your Template ID** (e.g., `template_xyz789`)

4. **Get your Public Key**
   - Go to "Account" > "General" in your EmailJS dashboard
   - Find "API Keys"
   - **Copy your Public Key** (e.g., `abc123xyz789`)

5. **Update email-config.js**
   - Open `email-config.js`
   - Replace the placeholder values with your actual credentials:
     - `YOUR_PUBLIC_KEY` → Your Public Key
     - `YOUR_SERVICE_ID` → Your Service ID
     - `YOUR_TEMPLATE_ID` → Your Template ID

6. **Test it!**
   - Make a test reservation
   - Check your email inbox
   - The order number should be sent automatically

## Template Variables Available

- `{{to_name}}` - Customer's name
- `{{to_email}}` - Customer's email
- `{{order_number}}` - 6-digit order number
- `{{reservation_date}}` - Formatted reservation date
- `{{reservation_time}}` - Reservation time
- `{{table_number}}` - Table number (VIP Table 1-4 or Table 5-50)
- `{{number_of_guests}}` - Number of guests
- `{{from_name}}` - "Bar Chinesca Mxli"
