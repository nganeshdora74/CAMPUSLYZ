const express = require("express");
const router = express.Router();
const timetableController = require("../controllers/timetableController");
const auth = require("../middleware/auth");

router.get("/my", auth, timetableController.getMyTimetable);
router.get("/next", auth, timetableController.getNextClass);

module.exports = router;
