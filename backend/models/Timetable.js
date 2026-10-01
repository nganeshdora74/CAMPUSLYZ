const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    department: String,
    semester: Number,
    section: String,
    day: String,
    dayOrder: Number,
    startTime: String,
    endTime: String,
    subject: String,
    faculty: String,
    room: String,
    isCancelled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Timetable", timetableSchema);
