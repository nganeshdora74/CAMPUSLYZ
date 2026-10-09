const { PassRequest, Notification } = require("../models");

/**
 * Submit Leave or Gate Pass application
 */
exports.submitPass = async (req, res) => {
  try {
    const {
      type, // 'leave' or 'gate_pass'
      studentId,
      studentName,
      studentEmail,
      rollNo,
      department,
      roomNo,
      hostelBlock,
      reason,
      category = "General",
      priority = "Normal",
      fromDate,
      toDate,
      outTime,
      returnTime,
      destination,
      contactNumber,
      photoUrl,
      pdfUrl,
    } = req.body;

    if (!type || !studentName || !studentEmail || !reason) {
      return res.status(400).json({
        success: false,
        message: "Type, student name, email, and reason are required",
      });
    }

    const pass = await PassRequest.create({
      type,
      studentId: studentId || null,
      studentName,
      studentEmail: studentEmail.toLowerCase().trim(),
      rollNo: rollNo || "",
      department: department || "",
      roomNo: roomNo || "",
      hostelBlock: hostelBlock || "",
      reason,
      category,
      priority,
      fromDate: fromDate || "",
      toDate: toDate || "",
      outTime: outTime || "",
      returnTime: returnTime || "",
      destination: destination || "",
      contactNumber: contactNumber || "",
      photoUrl: photoUrl || "",
      pdfUrl: pdfUrl || "",
      status: "pending",
    });

    const isLeave = type === "leave";
    const passLabel = isLeave ? "Leave Request" : "Gate Pass";

    // 1. Create Outgoing notification record for the student
    await Notification.create({
      title: `${passLabel} Submitted 📋`,
      body: `Your ${passLabel.toLowerCase()} request (${reason.slice(0, 50)}) has been submitted to administration.`,
      type: isLeave ? "leave" : "gate_pass",
      category: "Pass",
      senderId: studentId || null,
      senderName: studentName,
      senderEmail: studentEmail.toLowerCase().trim(),
      senderRole: "student",
      studentId: studentId || null,
      studentEmail: studentEmail.toLowerCase().trim(),
      target: "Specific",
      status: "sent",
      data: { passId: pass._id, type, status: "pending" },
    });

    // 2. Create Incoming notification for Hostel Managers & Admin
    await Notification.create({
      title: `New ${passLabel}: ${studentName}`,
      body: `${studentName} (${rollNo || "Hosteller"}) requested a ${passLabel.toLowerCase()}: "${reason.slice(0, 60)}"`,
      type: isLeave ? "leave" : "gate_pass",
      category: "Hostel",
      senderId: studentId || null,
      senderName: studentName,
      senderEmail: studentEmail.toLowerCase().trim(),
      senderRole: "student",
      target: "Hostel Students",
      targetHostel: hostelBlock || null,
      status: "sent",
      data: { passId: pass._id, type, status: "pending", studentEmail },
    });

    console.log(`[Pass] ${passLabel} submitted by ${studentName} (${studentEmail})`);

    res.status(201).json({
      success: true,
      message: "Notification sent successfully! Request submitted.",
      pass,
    });
  } catch (error) {
    console.error("submitPass error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get pass requests (filter by studentEmail, status, type)
 */
exports.getPasses = async (req, res) => {
  try {
    const { studentEmail, status, type } = req.query;
    let filter = {};

    if (studentEmail) filter.studentEmail = studentEmail.toLowerCase().trim();
    if (status) filter.status = status;
    if (type) filter.type = type;

    const passes = await PassRequest.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: passes.length,
      passes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update pass status (Approve or Reject)
 */
exports.updatePassStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionComment, actionBy } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const pass = await PassRequest.findByIdAndUpdate(
      id,
      {
        status,
        actionComment: actionComment || "",
        actionBy: actionBy || "Hostel Warden",
        actionDate: new Date(),
      },
      { new: true }
    );

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: "Pass request not found",
      });
    }

    const isLeave = pass.type === "leave";
    const passLabel = isLeave ? "Leave Request" : "Gate Pass";
    const isApproved = status === "approved";

    // Create Notification sent directly to student
    await Notification.create({
      title: `${passLabel} ${isApproved ? "Approved ✅" : "Rejected ❌"}`,
      body: `Your ${passLabel.toLowerCase()} has been ${status} by ${actionBy || "Hostel Warden"}.${
        actionComment ? ` Remarks: ${actionComment}` : ""
      }`,
      type: isLeave ? "leave" : "gate_pass",
      category: "Hostel",
      senderName: actionBy || "Hostel Warden",
      senderRole: "hostel_manager",
      studentId: pass.studentId,
      studentEmail: pass.studentEmail,
      target: "Specific",
      status: "sent",
      data: { passId: pass._id, type: pass.type, status },
    });

    console.log(`[Pass Status] ${passLabel} for ${pass.studentName} updated to ${status}`);

    res.json({
      success: true,
      message: `Notification sent successfully! Request ${status}.`,
      pass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
