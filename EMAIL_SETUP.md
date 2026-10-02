# Reservation emails (Google Apps Script)

Customers get a bilingual (Spanish/English) email when they **book** a table and when they **cancel** one.
The emails are sent by a free Google Apps Script web app that runs on the bar's owner Google account and sends through Gmail as **"Bar Chinesca Mxli"**. No paid plan is needed
(Firebase stays on Spark; consumer Gmail allows about 100 recipients per day, the script stops at 90).

## How it works

1. After a booking (`script.js`, `onReservationBooked`) or a cancellation (`cancel.html`), the page calls
   `sendReservationEmail(type, orderNumber)`, which POSTs a `text/plain` JSON body (no CORS preflight) to
   `EMAIL_CONFIG.webAppUrl` in `email-config.js`: `{ type: "confirm" | "cancel", orderNumber, idToken }`
   (plus the cancelled booking's details for a cancel).
2. The script verifies the Firebase ID token with Identity Toolkit `accounts:lookup` and only ever emails
   that account's own address.
3. **Confirm:** it reads `barReservations/{orderNumber}` from Firestore REST *with the user's token*
   (the security rules only let the owner read it), so every detail in the email comes from the database.
4. **Cancel:** the reservation is already deleted, so the script checks that it no longer exists and that the
   user's `barUserCounts/{uid}.lastOrder` is this order, updated in the last 15 minutes.
5. Limits per Mexicali day: 6 emails per account, 6 per recipient, 90 in total, and one email per order and type.

No Firestore rule changes are needed: the script only does owner reads the site already does.

## Turning it on or off

- `email-config.js`: `webAppUrl: 'https://script.google.com/macros/s/<deployment id>/exec'` turns emails on.
- `webAppUrl: ''` turns them off (nothing is sent, no errors). Bookings and cancellations never wait for
  or depend on the email.

## Setting up the script (once)

1. Go to https://script.google.com/ signed in as the bar's owner Google account and click **New project**.
   Name it `Bar Chinesca reservation emails`.
2. **Project Settings** (gear icon) > tick **Show "appsscript.json" manifest file in editor**.
3. Replace `appsscript.json` with the manifest (scopes: `script.send_mail` + `script.external_request`;
   web app: execute as the deploying user, access for anyone).
4. Replace `Code.gs` with the script source and save.
5. Select the function `sendTestEmails` and click **Run**. Google asks for permission; the account owner
   clicks **Review permissions**, picks the account, then **Advanced > Go to ... (unsafe) > Allow**
   (the app is private and unverified, which is normal). Two test emails arrive in the inbox.
6. **Deploy > New deployment** > type **Web app**; Execute as **Me**; Who has access **Anyone** > **Deploy**.
   Copy the **Web app URL** (ends in `/exec`) into `email-config.js`.
7. Opening the URL in a browser shows `{"ok":true,"service":"bar-chinesca-mail"}`.

When the script changes later: **Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy**
keeps the same URL.

## Troubleshooting

The browser console shows `Reservation email sent` or `Reservation email not sent: <reason>`
(`bad-token`, `not-found`, `not-owner`, `user-limit`, `daily-limit`, ...). The script's own logs are under
**Executions** in the Apps Script editor.
