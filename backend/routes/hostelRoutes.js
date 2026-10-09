const express = require("express");
const router = express.Router();
const hostelController = require("../controllers/hostelController");

router.get("/stats", hostelController.getHostelStats);
router.get("/rooms", hostelController.getRooms);
router.get("/residents", hostelController.getResidents);
router.post("/notices", hostelController.sendHostelNotice);

module.exports = router;
