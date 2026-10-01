const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    studentName: String,
    category: String,
    title: String,
    description: String,
    location: String,
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Complaint", complaintSchema);
