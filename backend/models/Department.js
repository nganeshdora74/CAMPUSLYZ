const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: String,
    shortName: String,
    hod: String,
    block: String,
    floor: String,
    contact: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Department", departmentSchema);
