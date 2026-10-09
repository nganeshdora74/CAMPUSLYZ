const { Hostel, PassRequest, Complaint, Notification } = require("../models");

/**
 * Get Hostel Dashboard Stats
 */
exports.getHostelStats = async (req, res) => {
  try {
    const totalRooms = 250;
    const totalResidents = 420;
    const pendingPasses = await PassRequest.countDocuments({ status: "pending" });
    const pendingComplaints = await Complaint.countDocuments({ status: "pending" });

    res.json({
      success: true,
      totalRooms,
      totalResidents,
      pendingPasses,
      pendingComplaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hostel Rooms List
 */
exports.getRooms = async (req, res) => {
  try {
    const rooms = [
      { roomNo: "101", block: "Block A", type: "Double Sharing", occupied: 2, capacity: 2, status: "occupied" },
      { roomNo: "102", block: "Block A", type: "Double Sharing", occupied: 1, capacity: 2, status: "available" },
      { roomNo: "103", block: "Block A", type: "Single", occupied: 1, capacity: 1, status: "occupied" },
      { roomNo: "104", block: "Block A", type: "Triple Sharing", occupied: 2, capacity: 3, status: "available" },
      { roomNo: "201", block: "Block B", type: "Double Sharing", occupied: 2, capacity: 2, status: "occupied" },
      { roomNo: "202", block: "Block B", type: "Double Sharing", occupied: 0, capacity: 2, status: "available" },
    ];
    res.json({ success: true, count: rooms.length, rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hostel Residents List
 */
exports.getResidents = async (req, res) => {
  try {
    const residents = [
      { name: "Rahul Sharma", rollNo: "23CSE001", block: "Block A", roomNo: "101", phone: "9876543210" },
      { name: "Ankit Kumar", rollNo: "23ECE012", block: "Block A", roomNo: "101", phone: "9876543211" },
      { name: "Vikas Singh", rollNo: "23ME045", block: "Block A", roomNo: "102", phone: "9876543212" },
      { name: "Ganesh Dora", rollNo: "23CSE003", block: "Block B", roomNo: "201", phone: "9876543213" },
    ];
    res.json({ success: true, count: residents.length, residents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send Hostel Notice & Notification to Hostellers
 */
exports.sendHostelNotice = async (req, res) => {
  try {
    const { title, message, targetBlock = "All Blocks", wardenName = "Hostel Warden" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    // 1. Create Outgoing notification for Hostel Manager
    await Notification.create({
      title: `Hostel Notice Published: ${title}`,
      body: message.slice(0, 75),
      type: "hostel",
      category: "Hostel",
      senderName: wardenName,
      senderRole: "hostel_manager",
      target: "Hostel Students",
      targetHostel: targetBlock !== "All Blocks" ? targetBlock : null,
      status: "sent",
    });

    // 2. Create Incoming notification for Hostellers
    await Notification.create({
      title,
      body: message,
      type: "hostel",
      category: "Hostel",
      senderName: wardenName,
      senderRole: "hostel_manager",
      target: "Hostel Students",
      targetHostel: targetBlock !== "All Blocks" ? targetBlock : null,
      status: "sent",
    });

    res.status(201).json({
      success: true,
      message: "Notification sent successfully! Hostel notice published.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
