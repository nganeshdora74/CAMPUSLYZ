const express = require("express");
const router = express.Router();
const noticeController = require("../controllers/noticeController");
const auth = require("../middleware/auth");

router.get("/", auth, noticeController.getNotices);

module.exports = router;
