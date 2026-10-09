const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const admin = require("../config/firebase");
const aiConfig = require("../config/ai");

const authRoutes = require("./authRoutes");
const timetableRoutes = require("./timetableRoutes");
const taskRoutes = require("./taskRoutes");
const calendarRoutes = require("./calendarRoutes");
const messageRoutes = require("./messageRoutes");
const facultyRoutes = require("./facultyRoutes");
const directoryRoutes = require("./directoryRoutes");
const noticeRoutes = require("./noticeRoutes");
const examRoutes = require("./examRoutes");
const complaintRoutes = require("./complaintRoutes");
const videoRoutes = require("./videoRoutes");
const noteRoutes = require("./noteRoutes");
const chatRoutes = require("./chatRoutes");
const adminRoutes = require("./adminRoutes");
const translateRoutes = require("./translateRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const notificationRoutes = require("./notificationRoutes");
const passRoutes = require("./passRoutes");
const feeRoutes = require("./feeRoutes");
const hostelRoutes = require("./hostelRoutes");
const messRoutes = require("./messRoutes");

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ai: aiConfig ? "configured (Gemini)" : "not configured",
    firebase: admin.apps.length > 0 ? "configured" : "not configured",
  });
});

// Mount module routes
router.use("/auth", authRoutes);
router.use("/timetable", timetableRoutes);
router.use("/tasks", taskRoutes);
router.use("/calendar", calendarRoutes);
router.use("/messages", messageRoutes);
router.use("/faculty", facultyRoutes);
router.use("/directory", directoryRoutes);
router.use("/notices", noticeRoutes);
router.use("/exams", examRoutes);
router.use("/complaints", complaintRoutes);
router.use("/videos", videoRoutes);
router.use("/notes", noteRoutes);
router.use("/chat", chatRoutes);
router.use("/admin", adminRoutes);
router.use("/translate", translateRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/passes", passRoutes);
router.use("/fees", feeRoutes);
router.use("/hostel", hostelRoutes);
router.use("/mess", messRoutes);

module.exports = router;
