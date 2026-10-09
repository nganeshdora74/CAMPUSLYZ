const admin = require("../config/firebase");
const { User } = require("../models");

const firebaseAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({
      success: false,
      message: "No authorization token",
    });
  }

  if (!admin.apps.length) {
    return res.status(503).json({
      success: false,
      message: "Firebase Admin is not configured",
    });
  }

  const token = req.headers.authorization.split(" ")[1] || "";

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Firebase account has no email",
      });
    }

    let mongoUser = await User.findOne({ email });

    if (!mongoUser) {
      let name = decoded.name || email.split("@")[0];
      let department = "";
      let semester = null;
      let section = "";
      let role = "student";
      if (email.includes("admin")) role = "admin";
      else if (email.includes("teacher") || email.includes("faculty")) role = "teacher";
      else if (email.includes("hostel")) role = "hostel_manager";
      else if (email.includes("mess")) role = "mess_manager";
      else if (email.includes("fee")) role = "fee_manager";
      else if (email.includes("notice")) role = "notice_manager";

      try {
        if (admin.apps.length) {
          const firestoreDoc = await admin
            .firestore()
            .collection("users")
            .doc(decoded.uid)
            .get();

          if (firestoreDoc.exists) {
            const data = firestoreDoc.data();
            if (data.fullName) name = data.fullName;
            if (data.role) role = data.role;
            else if (data.isTeacher) role = "teacher";
            if (data.department) department = data.department;
            if (data.semester) semester = Number(data.semester) || null;
            if (data.section) section = data.section;
            if (data.rollNo || data.rollNumber)
              rollNumber = data.rollNo || data.rollNumber;
          }
        }
      } catch (err) {
        console.warn("Could not fetch Firestore user details, using fallback:", err.message);
      }

      mongoUser = await User.create({
        name,
        email,
        password: "firebase-managed-account",
        role,
        department,
        semester,
        section,
        rollNumber,
      });

      console.log(`Auto-created MongoDB ${role} profile for ${email}`);
    } else {
      // Sync role if updated in Firestore
      try {
        if (admin.apps.length) {
          const firestoreDoc = await admin
            .firestore()
            .collection("users")
            .doc(decoded.uid)
            .get();
          if (firestoreDoc.exists) {
            const data = firestoreDoc.data();
            if (data.role && data.role !== mongoUser.role) {
              mongoUser.role = data.role;
              await mongoUser.save();
            }
          }
        }
      } catch (_) {}
    }

    req.user = {
      id: mongoUser._id.toString(),
      role: mongoUser.role,
      firebaseUid: decoded.uid,
      email,
    };

    next();
  } catch (error) {
    console.error("Firebase authentication error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Firebase token is not valid",
    });
  }
};

const optionalFirebaseAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !admin.apps.length) {
    return next();
  }

  const token = req.headers.authorization.split(" ")[1] || "";
  if (!token) return next();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase();
    if (email) {
      const mongoUser = await User.findOne({ email });
      if (mongoUser) {
        req.user = {
          id: mongoUser._id.toString(),
          role: mongoUser.role,
          firebaseUid: decoded.uid,
          email,
          name: mongoUser.name,
        };
      }
    }
  } catch (err) {
    // Optional auth - gracefully proceed even if token has expired or is invalid
  }
  next();
};

firebaseAuth.optional = optionalFirebaseAuth;
firebaseAuth.optionalFirebaseAuth = optionalFirebaseAuth;

module.exports = firebaseAuth;

