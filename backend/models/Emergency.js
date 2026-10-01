const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema(
  {
    title: String,
    number: String,
    description: String,
    order: Number,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Emergency", emergencySchema);
