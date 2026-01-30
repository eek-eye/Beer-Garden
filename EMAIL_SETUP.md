# Email Setup Instructions for Bar Chinesca Mxli

## Step-by-Step EmailJS Setup Guide

### Step 1: Create EmailJS Account (2 minutes)

1. Go to **https://www.emailjs.com/**
2. Click the **"Sign Up"** button (top right)
3. Sign up with:
   - Your email address
   - Create a password
   - Or use "Sign up with Google" (faster)
4. Verify your email if prompted
5. You'll be taken to your EmailJS dashboard

---

### Step 2: Create Email Service (3 minutes)

This connects EmailJS to your email account (Gmail, Outlook, etc.)

1. In your EmailJS dashboard, click **"Email Services"** (left sidebar)
2. Click the **"+ Add New Service"** button
3. Choose your email provider:
   - **Gmail** (recommended - easiest setup)
   - Outlook
   - Custom SMTP
4. **For Gmail:**
   - Click "Connect Account"
   - Sign in with your Gmail account
   - Click "Allow" to give EmailJS permission
   - Your service is now connected!
5. **Copy your Service ID:**
   - You'll see a Service ID like: `service_abc123xyz`
   - **Copy this** - you'll need it in Step 5

---

### Step 3: Create Email Template (5 minutes)

This is the email that customers will receive with their order number.

1. In EmailJS dashboard, click **"Email Templates"** (left sidebar)
2. Click **"+ Create New Template"** button
3. Fill in the template:

   **Template Name:** `Bar Chinesca Reservation Confirmation`

   **Subject:** (copy this exactly)
   ```
   Your Reservation Order Number - Bar Chinesca Mxli
   ```

   **Content:** (copy this exactly)
   ```
   Hello {{to_name}},

   Thank you for your reservation at Bar Chinesca Mxli!

   Your Order Number: {{order_number}}

   Reservation Details:
   - Date: {{reservation_date}}
   - Time: {{reservation_time}}
   - Table: {{table_number}}
   - Number of Guests: {{number_of_guests}}

   Please save your order number ({{order_number}}) as you'll need it to cancel your reservation if needed.

   We look forward to seeing you!

   Bar Chinesca Mxli
   ```

4. **Important:** Make sure these variables are in your template:
   - `{{to_name}}`
   - `{{order_number}}`
   - `{{reservation_date}}`
   - `{{reservation_time}}`
   - `{{table_number}}`
   - `{{number_of_guests}}`

5. Click **"Save"** button
6. **Copy your Template ID:**
   - You'll see a Template ID like: `template_xyz789abc`
   - **Copy this** - you'll need it in Step 5

---

### Step 4: Get Your Public Key (1 minute)

1. In EmailJS dashboard, click **"Account"** (top right, your profile icon)
2. Click **"General"** in the dropdown
3. Scroll down to **"API Keys"** section
4. You'll see your **Public Key** (looks like: `abc123xyz789`)
5. **Copy this** - you'll need it in Step 5

---

### Step 5: Update Your Configuration File (2 minutes)

1. Open the file **`email-config.js`** in your project folder
2. You'll see three lines that say:
   ```javascript
   publicKey: 'YOUR_PUBLIC_KEY',
   serviceID: 'YOUR_SERVICE_ID',
   templateID: 'YOUR_TEMPLATE_ID',
   ```
3. Replace each one with your actual values:

   **Example:**
   ```javascript
   publicKey: 'abc123xyz789',           // ← Your Public Key from Step 4
   serviceID: 'service_abc123xyz',      // ← Your Service ID from Step 2
   templateID: 'template_xyz789abc',    // ← Your Template ID from Step 3
   ```

4. **Save the file**

---

### Step 6: Test It! (2 minutes)

1. Open your website (`index.html`)
2. Make a test reservation:
   - Enter your name
   - Enter your email address
   - Select a date, time, guests, and table
   - Click "Submit Reservation Request"
3. **Check your email inbox** - you should receive an email with the order number!
4. **Check browser console** (press F12):
   - If email sent successfully, you'll see: `✅ Email sent successfully!`
   - If there's an error, you'll see the error message

---

## Troubleshooting

### Email not sending?

1. **Check browser console (F12):**
   - Look for error messages
   - Common errors:
     - "Invalid service ID" → Check your Service ID
     - "Invalid template ID" → Check your Template ID
     - "Invalid public key" → Check your Public Key

2. **Verify your credentials:**
   - Open `email-config.js`
   - Make sure all three values are correct
   - Make sure there are no extra spaces or quotes

3. **Check EmailJS dashboard:**
   - Make sure your email service is "Active"
   - Make sure your template is saved

4. **Check spam folder:**
   - Sometimes emails go to spam

### Still not working?

- Make sure you saved `email-config.js` after updating
- Refresh your browser page
- Try making another test reservation
- Check EmailJS dashboard for any error messages

---

## What Happens Now?

Once set up, every time a customer makes a reservation:
1. ✅ Order number is generated
2. ✅ Reservation is saved
3. ✅ **Email is automatically sent** to the customer
4. ✅ Customer receives their order number via email

---

## Free Tier Limits

EmailJS free tier includes:
- **200 emails per month** (perfect for small restaurants/bars)
- If you need more, upgrade to a paid plan

---

## Need Help?

If you get stuck:
1. Check the EmailJS documentation: https://www.emailjs.com/docs/
2. Check browser console (F12) for error messages
3. Make sure all three credentials are correct in `email-config.js`
