const {
  User,
  Timetable,
  Task,
  AcademicEvent,
  Message,
  Notice,
  Complaint,
  Video,
  SavedVideo,
  Note,
  SavedNote,
} = require("../models");

// Timetable
exports.addTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.create(req.body);
    res.json({
      success: true,
      timetable,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Calendar
exports.createCalendarEvent = async (req, res) => {
  try {
    const event = await AcademicEvent.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateCalendarEvent = async (req, res) => {
  try {
    const event = await AcademicEvent.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );

    if (!event) {
      return res.status(404).json({
        message: "Calendar event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteCalendarEvent = async (req, res) => {
  try {
    await AcademicEvent.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Calendar event deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Notices
exports.createNotice = async (req, res) => {
  try {
    const notice = await Notice.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.json({
      success: true,
      notice,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Videos
exports.createVideo = async (req, res) => {
  try {
    const video = await Video.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.json({
      success: true,
      video,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json({
      success: true,
      video,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    await SavedVideo.deleteMany({ video: req.params.id });

    res.json({
      success: true,
      message: "Video deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Notes
exports.createNote = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const note = await Note.create({
      ...req.body,
      createdBy: req.user.id,
      createdByName: user.name,
    });

    res.json({
      success: true,
      note,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json({
      success: true,
      note,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    await SavedNote.deleteMany({ note: req.params.id });

    res.json({
      success: true,
      message: "Note deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Complaints
exports.getComplaints = async (req, res) => {
  try {
    const data = await Complaint.find()
      .sort({
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

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({
      role: "student",
    });

    const activeNotices = await Notice.countDocuments({
      status: "active",
    });

    const pendingComplaints = await Complaint.countDocuments({
      status: "Pending",
    });

    const totalTasks = await Task.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalCalendarEvents = await AcademicEvent.countDocuments();

    res.json({
      success: true,
      totalStudents,
      activeNotices,
      pendingComplaints,
      totalTasks,
      totalMessages,
      totalCalendarEvents,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
