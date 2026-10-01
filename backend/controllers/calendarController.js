const { User, AcademicEvent } = require("../models");

exports.getCalendarEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const filter = {
      $or: [{ department: "" }, { department: user.department }],
    };

    if (req.query.date) {
      filter.date = req.query.date;
    }

    const events = await AcademicEvent.find(filter).sort({
      date: 1,
    });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getEventsByDate = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const events = await AcademicEvent.find({
      date: req.params.date,
      $or: [{ department: "" }, { department: user.department }],
    }).sort({
      date: 1,
    });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
