const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const auth = require("../middleware/auth");
const checkTeacherOrAdmin = require("../middleware/teacherOrAdmin");

// Student view routes (requires authentication)
router.get("/my", auth, attendanceController.getMySubjectAttendance);
router.get("/subject-summary", auth, attendanceController.getSubjectSummary);
router.get("/student/:studentId", auth, attendanceController.getStudentSubjectAttendance);

// Teacher & Admin mutation routes (strictly protected: only teachers & admins can modify)
router.post("/rechange", auth, checkTeacherOrAdmin, attendanceController.rechangeStudentAttendance);
router.put("/rechange", auth, checkTeacherOrAdmin, attendanceController.rechangeStudentAttendance);
router.post("/", auth, checkTeacherOrAdmin, attendanceController.recordSubjectAttendance);
router.put("/:id", auth, checkTeacherOrAdmin, attendanceController.updateAttendanceRecord);
router.delete("/:id", auth, checkTeacherOrAdmin, attendanceController.deleteAttendanceRecord);

module.exports = router;

