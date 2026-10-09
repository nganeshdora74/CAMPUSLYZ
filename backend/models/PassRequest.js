const mongoose = require("mongoose");

const passRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["leave", "gate_pass"],
      required: true,
    },
    studentId: {
      type: String,
      default: null,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    rollNo: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    roomNo: {
      type: String,
      default: "",
    },
    hostelBlock: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    priority: {
      type: String,
      default: "Normal",
    },
    fromDate: {
      type: String,
      default: "",
    },
    toDate: {
      type: String,
      default: "",
    },
    outTime: {
      type: String,
      default: "",
    },
    returnTime: {
      type: String,
      default: "",
    },
    destination: {
      type: String,
      default: "",
    },
    contactNumber: {
      type: String,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    actionComment: {
      type: String,
      default: "",
    },
    actionBy: {
      type: String,
      default: "",
    },
    actionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

passRequestSchema.index({ studentEmail: 1, createdAt: -1 });
passRequestSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model("PassRequest", passRequestSchema);
