const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    message: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "notice",
        "leave",
        "gate_pass",
        "fee",
        "hostel",
        "mess",
        "attendance",
        "certificate",
        "general",
      ],
      default: "general",
    },
    category: {
      type: String,
      default: "General",
    },
    target: {
      type: String,
      default: "All Students",
    },
    targetHostel: {
      type: String,
      default: null,
    },
    // Sender details (for tracking "Going" / Outgoing notifications)
    senderId: {
      type: String,
      default: null,
    },
    senderName: {
      type: String,
      default: "Campus Administration",
    },
    senderEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    senderRole: {
      type: String,
      default: null,
    },
    // Recipient details (for tracking "Coming" / Incoming notifications)
    studentId: {
      type: String,
      default: null,
    },
    studentEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readBy: {
      type: [String],
      default: [],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup of incoming vs outgoing notifications
notificationSchema.index({ senderEmail: 1, createdAt: -1 });
notificationSchema.index({ studentEmail: 1, createdAt: -1 });
notificationSchema.index({ target: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
