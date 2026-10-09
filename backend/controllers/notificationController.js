const { Notification } = require("../models");

/**
 * Send a notification (stores in MongoDB and confirms delivery)
 */
exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      body,
      message,
      type = "general",
      category = "General",
      target = "All Students",
      targetHostel = null,
      senderId,
      senderName = "Campus Administration",
      senderEmail,
      senderRole,
      studentId,
      studentEmail,
      data = {},
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required for notification",
      });
    }

    const content = body || message || "";

    const notification = await Notification.create({
      title,
      body: content,
      message: content,
      type,
      category,
      target,
      targetHostel,
      senderId: senderId || req.user?.id || null,
      senderName: senderName || req.user?.name || "Campus Administration",
      senderEmail: (senderEmail || req.user?.email || "").toLowerCase(),
      senderRole: senderRole || req.user?.role || "admin",
      studentId: studentId || null,
      studentEmail: studentEmail ? studentEmail.toLowerCase() : null,
      status: "sent",
      readBy: [],
      data,
    });

    console.log(`[Notification] Sent "${title}" from ${notification.senderName} (${notification.senderRole}) -> Target: ${target}`);

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      notification,
    });
  } catch (error) {
    console.error("sendNotification error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get notifications: supports filtering by direction (incoming, outgoing, all)
 */
exports.getNotifications = async (req, res) => {
  try {
    const { email, userId, direction = "all", type, limit = 50 } = req.query;
    const userEmail = (email || req.user?.email || "").toLowerCase().trim();
    const uid = userId || req.user?.id || null;

    let filter = {};

    if (type) {
      filter.type = type;
    }

    if (direction === "outgoing") {
      // Sent by this user
      if (userEmail && uid) {
        filter.$or = [{ senderEmail: userEmail }, { senderId: uid }];
      } else if (userEmail) {
        filter.senderEmail = userEmail;
      } else if (uid) {
        filter.senderId = uid;
      }
    } else if (direction === "incoming") {
      // Received by this user
      if (userEmail && uid) {
        filter.$or = [
          { studentEmail: userEmail },
          { studentId: uid },
          { target: "All Students" },
          { target: "All" },
        ];
      } else if (userEmail) {
        filter.$or = [
          { studentEmail: userEmail },
          { target: "All Students" },
          { target: "All" },
        ];
      } else {
        filter.$or = [{ target: "All Students" }, { target: "All" }];
      }
    } else {
      // Direction 'all' -> both incoming and outgoing relevant to user
      if (userEmail) {
        filter.$or = [
          { senderEmail: userEmail },
          { studentEmail: userEmail },
          { target: "All Students" },
          { target: "All" },
        ];
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("getNotifications error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIdentifier } = req.body;
    const identifier = userIdentifier || req.user?.email || req.user?.id || "read";

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        $addToSet: { readBy: identifier },
        status: "read",
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Notification removed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
