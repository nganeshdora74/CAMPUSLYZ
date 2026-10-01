const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const aiConfig = process.env.OPENROUTER_API_KEY
  ? {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free",
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://campusly.app",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Campusly",
      },
    }
  : null;

module.exports = aiConfig;
