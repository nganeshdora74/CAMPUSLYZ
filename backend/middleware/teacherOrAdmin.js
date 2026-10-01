const { User } = require("../models");

/**
 * Middleware ensuring only teachers and administrators can modify or record student attendance.
 */
const checkTeacherOrAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "admin" && user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Permission denied: Only teachers and administrators can change or record student attendance.",
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = checkTeacherOrAdmin;
