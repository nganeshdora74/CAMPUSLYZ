const { FeeRecord, Notification } = require("../models");

/**
 * Get Fee Overview Statistics
 */
exports.getFeeStats = async (req, res) => {
  try {
    const records = await FeeRecord.find();
    
    // Seed default sample records if empty
    if (records.length === 0) {
      const sample = [
        {
          studentName: "Rahul Kumar",
          studentEmail: "rahul.student@gmail.com",
          rollNo: "23CSE001",
          department: "CSE",
          semester: 4,
          feeType: "Tuition Fee",
          totalAmount: 45000,
          paidAmount: 45000,
          dueAmount: 0,
          status: "paid",
          dueDate: "15 Oct 2026",
          transactions: [
            {
              transactionId: "TXN-90214",
              amount: 45000,
              date: "02 Oct 2026",
              method: "UPI",
              receiptNo: "REC-2026-001",
            },
          ],
        },
        {
          studentName: "Priya Sharma",
          studentEmail: "priya.student@gmail.com",
          rollNo: "23CSE002",
          department: "CSE",
          semester: 4,
          feeType: "Tuition Fee",
          totalAmount: 45000,
          paidAmount: 25000,
          dueAmount: 20000,
          status: "partial",
          dueDate: "20 Oct 2026",
          transactions: [
            {
              transactionId: "TXN-88123",
              amount: 25000,
              date: "28 Sep 2026",
              method: "Net Banking",
              receiptNo: "REC-2026-002",
            },
          ],
        },
        {
          studentName: "Amit Verma",
          studentEmail: "amit.student@gmail.com",
          rollNo: "23ECE015",
          department: "ECE",
          semester: 4,
          feeType: "Tuition Fee",
          totalAmount: 45000,
          paidAmount: 0,
          dueAmount: 45000,
          status: "pending",
          dueDate: "10 Oct 2026",
          transactions: [],
        },
        {
          studentName: "Sneha Patel",
          studentEmail: "sneha.student@gmail.com",
          rollNo: "23ME008",
          department: "ME",
          semester: 4,
          feeType: "Hostel Fee",
          totalAmount: 22000,
          paidAmount: 0,
          dueAmount: 22000,
          status: "overdue",
          dueDate: "01 Oct 2026",
          transactions: [],
        },
      ];
      await FeeRecord.insertMany(sample);
      const newRecords = await FeeRecord.find();
      return res.json(calculateStats(newRecords));
    }

    res.json(calculateStats(records));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function calculateStats(records) {
  let totalFees = 0;
  let collected = 0;
  let pending = 0;
  let overdue = 0;

  records.forEach((r) => {
    totalFees += r.totalAmount || 0;
    collected += r.paidAmount || 0;
    pending += r.dueAmount || 0;
    if (r.status === "overdue") overdue += r.dueAmount || 0;
  });

  return {
    success: true,
    totalFees,
    collected,
    pending,
    overdue,
    totalStudents: records.length,
  };
}

/**
 * Get Students Fee List
 */
exports.getStudentsFees = async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { rollNo: { $regex: search, $options: "i" } },
        { studentEmail: { $regex: search, $options: "i" } },
      ];
    }

    const students = await FeeRecord.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Record a Fee Payment
 */
exports.recordPayment = async (req, res) => {
  try {
    const {
      studentEmail,
      amount,
      paymentMethod = "UPI",
      feeType = "Tuition Fee",
    } = req.body;

    if (!studentEmail || !amount) {
      return res.status(400).json({
        success: false,
        message: "Student email and amount are required",
      });
    }

    let record = await FeeRecord.findOne({
      studentEmail: studentEmail.toLowerCase().trim(),
    });

    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
    const txnId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    if (!record) {
      record = await FeeRecord.create({
        studentName: studentEmail.split("@")[0],
        studentEmail: studentEmail.toLowerCase().trim(),
        totalAmount: Number(amount),
        paidAmount: Number(amount),
        dueAmount: 0,
        status: "paid",
        feeType,
        transactions: [
          {
            transactionId: txnId,
            amount: Number(amount),
            date: new Date().toLocaleDateString("en-GB"),
            method: paymentMethod,
            receiptNo,
          },
        ],
      });
    } else {
      record.paidAmount += Number(amount);
      record.dueAmount = Math.max(0, record.totalAmount - record.paidAmount);
      record.status = record.dueAmount === 0 ? "paid" : "partial";
      record.transactions.push({
        transactionId: txnId,
        amount: Number(amount),
        date: new Date().toLocaleDateString("en-GB"),
        method: paymentMethod,
        receiptNo,
      });
      await record.save();
    }

    // Trigger Notification to Student
    await Notification.create({
      title: "Fee Payment Received 💳",
      body: `Payment of ₹${amount} received for ${feeType}. Receipt: ${receiptNo}.`,
      type: "fee",
      category: "Finance",
      senderName: "Finance & Accounts",
      senderRole: "fee_manager",
      studentEmail: record.studentEmail,
      target: "Specific",
      status: "sent",
      data: { receiptNo, amount, txnId },
    });

    res.json({
      success: true,
      message: "Notification sent successfully! Payment recorded.",
      receiptNo,
      record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send Fee Reminder Notification
 */
exports.sendFeeReminder = async (req, res) => {
  try {
    const { studentEmail, studentName, dueAmount, dueDate, feeType = "Semester Fee" } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ success: false, message: "Student email is required" });
    }

    // 1. Create Outgoing notification for Fee Manager
    await Notification.create({
      title: `Fee Reminder Sent: ${studentName || studentEmail}`,
      body: `Reminder sent for pending ${feeType} (₹${dueAmount || 0}) due on ${dueDate || "soon"}.`,
      type: "fee",
      category: "Finance",
      senderName: "Fees Manager",
      senderRole: "fee_manager",
      target: "Specific",
      studentEmail: studentEmail.toLowerCase().trim(),
      status: "sent",
    });

    // 2. Create Incoming notification for Student
    await Notification.create({
      title: `Fee Payment Reminder ⚠️`,
      body: `Dear ${studentName || "Student"}, please clear your pending ${feeType} of ₹${
        dueAmount || 0
      } before ${dueDate || "the due date"} to avoid late fines.`,
      type: "fee",
      category: "Finance",
      senderName: "Accounts Office",
      senderRole: "fee_manager",
      studentEmail: studentEmail.toLowerCase().trim(),
      target: "Specific",
      status: "sent",
    });

    res.json({
      success: true,
      message: "Notification sent successfully! Fee reminder delivered.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
