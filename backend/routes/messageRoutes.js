const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const auth = require("../middleware/auth");

router.post("/", auth, messageController.sendMessage);
router.get("/users/list", auth, messageController.getMessageUsers);
router.get("/unread/count", auth, messageController.getUnreadCount);
router.get("/:userId", auth, messageController.getConversation);
router.put("/:id/read", auth, messageController.markMessageRead);

module.exports = router;
