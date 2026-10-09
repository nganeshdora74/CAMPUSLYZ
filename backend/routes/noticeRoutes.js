const express = require("express");
const router = express.Router();
const noticeController = require("../controllers/noticeController");

router.get("/", noticeController.getNotices);
router.post("/", noticeController.createNotice);
router.put("/:id", noticeController.updateNotice);
router.patch("/:id", noticeController.updateNotice);
router.delete("/:id", noticeController.deleteNotice);

module.exports = router;
