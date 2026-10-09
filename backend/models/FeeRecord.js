const mongoose = require("mongoose");

const feeRecordSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    rollNo: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "CSE",
    },
    semester: {
      type: Number,
      default: 1,
    },
    feeType: {
      type: String,
      default: "Tuition Fee",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["paid", "pending", "overdue", "partial"],
      default: "pending",
    },
    transactions: [
      {
        transactionId: String,
        amount: Number,
        date: String,
        method: String,
        receiptNo: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

feeRecordSchema.index({ studentEmail: 1 });
feeRecordSchema.index({ status: 1 });

module.exports = mongoose.model("FeeRecord", feeRecordSchema);
