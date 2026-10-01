const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const admin = require("firebase-admin");

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });

      console.log("Firebase Admin initialized");
    } catch (error) {
      console.error("Firebase Admin initialization error:", error.message);
    }
  }
} else {
  console.warn(
    "Firebase Admin is not configured. Add Firebase credentials to .env"
  );
}

module.exports = admin;
