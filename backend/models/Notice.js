const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notice", noticeSchema);
