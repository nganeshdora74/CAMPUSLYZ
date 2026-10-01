const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: String,
    department: String,
    designation: String,
    subjects: [String],
    cabin: String,
    email: String,
    officeHours: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Faculty", facultySchema);
