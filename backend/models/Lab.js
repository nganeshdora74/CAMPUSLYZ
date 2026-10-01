const mongoose = require("mongoose");

const labSchema = new mongoose.Schema(
  {
    name: String,
    department: String,
    block: String,
    floor: String,
    room: String,
    inCharge: String,
    capacity: Number,
    timings: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lab", labSchema);
