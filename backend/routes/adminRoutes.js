const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const checkAdmin = require("../middleware/admin");

// Apply admin protection to all admin routes
router.use(auth, checkAdmin);

// Timetable
router.post("/timetable", adminController.addTimetable);

// Calendar
router.post("/calendar", adminController.createCalendarEvent);
router.put("/calendar/:id", adminController.updateCalendarEvent);
router.delete("/calendar/:id", adminController.deleteCalendarEvent);

// Notices
router.post("/notices", adminController.createNotice);

// Videos
router.post("/videos", adminController.createVideo);
router.put("/videos/:id", adminController.updateVideo);
router.delete("/videos/:id", adminController.deleteVideo);

// Notes
router.post("/notes", adminController.createNote);
router.put("/notes/:id", adminController.updateNote);
router.delete("/notes/:id", adminController.deleteNote);

// Complaints
router.get("/complaints", adminController.getComplaints);
router.put("/complaints/:id", adminController.updateComplaintStatus);

// Dashboard
router.get("/dashboard", adminController.getDashboardStats);

module.exports = router;
