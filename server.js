const admin = require("firebase-admin");
const path = require("path");

// Load service account key from project root (keep this file out of git)
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error(
    "Missing serviceAccountKey.json. Add your Firebase service account key to the project root. See FIREBASE_ADMIN_SETUP.md"
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Optional: verify Google ID tokens from the frontend
async function verifyIdToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (e) {
    console.error("Token verification failed:", e.message);
    return null;
  }
}

// Export for use in API routes if you add them later
module.exports = { admin, verifyIdToken };

// Minimal HTTP server (optional – extend with your routes)
const http = require("http");
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bar Chinesca Mxli API – Firebase Admin initialized.");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
