const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { JWT_SECRET } = require("../config/env");

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      semester,
      section,
      rollNumber,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = req.body.role || "student";

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      department,
      semester,
      section,
      rollNumber,
    });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        section: user.section,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email?.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        section: user.section,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.syncFirebaseUser = async (req, res) => {
  try {
    const { name, email, role, department, semester, section, rollNumber } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to sync account",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: "firebase-authenticated-account",
        role: role || "student",
        department: department || "",
        semester: semester || null,
        section: section || "",
        rollNumber: rollNumber || "",
      });
      console.log(`Created new MongoDB profile for synced user ${normalizedEmail} with role: ${user.role}`);
    } else {
      let updated = false;
      if (role && user.role !== role) {
        user.role = role;
        updated = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (department && !user.department) {
        user.department = department;
        updated = true;
      }
      if (rollNumber && !user.rollNumber) {
        user.rollNumber = rollNumber;
        updated = true;
      }
      if (updated) {
        await user.save();
        console.log(`Updated MongoDB profile for ${normalizedEmail} (Role: ${user.role})`);
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        section: user.section,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("syncFirebaseUser error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

