const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    authorName: {
      type: String,
      default: "Administration",
    },
    authorRole: {
      type: String,
      default: "admin",
    },
    target: {
      type: String,
      default: "All Students",
    },
    targetBranch: {
      type: String,
      default: "All",
    },
    targetHostel: {
      type: String,
      default: "All",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
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

noticeSchema.index({ status: 1, createdAt: -1 });
noticeSchema.index({ category: 1 });
noticeSchema.index({ authorRole: 1 });

module.exports = mongoose.model("Notice", noticeSchema);
