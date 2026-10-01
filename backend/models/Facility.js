const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    block: String,
    floor: String,
    timings: String,
    description: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Facility", facilitySchema);
