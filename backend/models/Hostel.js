const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    warden: String,
    contact: String,
    messTimings: String,
    rules: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hostel", hostelSchema);
