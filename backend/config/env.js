const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || "campusly-secret-key",
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || "",
};
