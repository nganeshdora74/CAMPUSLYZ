const { Notice, Notification } = require("../models");

/**
 * Get all active notices
 */
exports.getNotices = async (req, res) => {
  try {
    const { category, authorRole } = req.query;
    let filter = { status: "active" };

    if (category && category !== "All") filter.category = category;
    if (authorRole) filter.authorRole = authorRole;

    const data = await Notice.find(filter)
      .sort({
        isPinned: -1,
        createdAt: -1,
      })
      .limit(50);

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Create a new notice in MongoDB and broadcast notification
 */
exports.createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      message,
      category = "General",
      priority = "medium",
      authorName = "Faculty / Staff",
      authorRole = "admin",
      authorId,
      authorEmail,
      target = "All Students",
      targetBranch = "All",
      targetHostel = "All",
      photoUrl,
      videoUrl,
      isPinned = false,
    } = req.body;

    const noticeContent = content || message || "";

    if (!title || !noticeContent) {
      return res.status(400).json({
        success: false,
        message: "Notice title and content are required",
      });
    }

    const notice = await Notice.create({
      title,
      content: noticeContent,
      message: noticeContent,
      category,
      priority,
      authorName,
      authorRole,
      target,
      targetBranch,
      targetHostel,
      photoUrl: photoUrl || "",
      videoUrl: videoUrl || "",
      isPinned: Boolean(isPinned),
      status: "active",
      createdBy: authorId || req.user?.id || null,
    });

    // 1. Create Outgoing notification record for author
    await Notification.create({
      title: `Notice Published: ${title}`,
      body: noticeContent.slice(0, 80),
      type: "notice",
      category,
      target,
      senderId: authorId || req.user?.id || null,
      senderName: authorName,
      senderEmail: (authorEmail || req.user?.email || "").toLowerCase(),
      senderRole: authorRole,
      status: "sent",
      data: { noticeId: notice._id },
    });

    // 2. Broadcast Incoming notification to target audience
    await Notification.create({
      title,
      body: noticeContent,
      type: "notice",
      category,
      target: target || "All Students",
      targetHostel: targetHostel !== "All" ? targetHostel : null,
      senderName: authorName,
      senderRole: authorRole,
      status: "sent",
      data: { noticeId: notice._id, category, priority },
    });

    console.log(`[Notice] Created "${title}" by ${authorName} (${authorRole})`);

    res.status(201).json({
      success: true,
      message: "Notification sent successfully! Notice published.",
      notice,
    });
  } catch (error) {
    console.error("createNotice error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a notice
 */
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    await Notice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update a notice
 */
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Notice.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({
      success: true,
      message: "Notice updated successfully",
      notice: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

