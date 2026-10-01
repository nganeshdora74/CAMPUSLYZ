const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    department: String,
    semester: Number,
    subject: String,
    examDate: String,
    time: String,
    room: String,
    rollRange: String,
    instructions: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Exam", examSchema);
