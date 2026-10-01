const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    subjectCode: {
      type: String,
      default: "",
      trim: true,
    },
    department: {
      type: String,
      default: "CSE",
      trim: true,
    },
    section: {
      type: String,
      default: "A",
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
      default: "Present",
    },
    present: {
      type: Boolean,
      required: true,
      default: true,
    },
    remarks: {
      type: String,
      default: "-",
      trim: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    markedByName: {
      type: String,
      default: "Faculty Instructor",
    },
    markedByRole: {
      type: String,
      enum: ["teacher", "admin"],
      default: "teacher",
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes for efficient subject-wise querying
attendanceSchema.index({ student: 1, subject: 1, date: 1 });
attendanceSchema.index({ subject: 1, date: 1, section: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
