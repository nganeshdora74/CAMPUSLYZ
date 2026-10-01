const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: "AI chat limit exceeded. Please wait.",
  },
});

module.exports = {
  limiter,
  chatLimiter,
};
