const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendarController");
const auth = require("../middleware/auth");

router.get("/", auth, calendarController.getCalendarEvents);
router.get("/date/:date", auth, calendarController.getEventsByDate);

module.exports = router;
