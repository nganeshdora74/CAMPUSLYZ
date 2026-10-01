const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const auth = (req, res, next) => {
  const header = req.header("Authorization");

  if (!header) {
    return res.status(401).json({
      success: false,
      message: "No authorization token",
    });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

module.exports = auth;
