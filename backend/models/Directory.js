const mongoose = require("mongoose");

const directorySchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    block: String,
    floor: String,
    room: String,
    description: String,
    keywords: [String],
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Directory", directorySchema);
