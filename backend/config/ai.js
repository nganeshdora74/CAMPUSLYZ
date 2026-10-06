const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const aiConfig = process.env.GEMINI_API_KEY
  ? {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    }
  : null;

module.exports = aiConfig;