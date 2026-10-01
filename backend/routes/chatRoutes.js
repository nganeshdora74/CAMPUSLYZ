const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const firebaseAuth = require("../middleware/firebaseAuth");
const { chatLimiter } = require("../middleware/rateLimiter");

router.post("/", firebaseAuth, chatLimiter, chatController.chatWithAI);

module.exports = router;
