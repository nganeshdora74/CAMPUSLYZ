const { User, Timetable } = require("../models");

exports.getMyTimetable = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const data = await Timetable.find({
      department: user.department,
      semester: user.semester,
      section: user.section,
      isCancelled: false,
    }).sort({
      dayOrder: 1,
      startTime: 1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getNextClass = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const classes = await Timetable.find({
      department: user.department,
      semester: user.semester,
      section: user.section,
      day: currentDay,
      isCancelled: false,
    }).sort({
      startTime: 1,
    });

    const nextClass = classes.find((item) => item.startTime > currentTime);

    res.json(nextClass || null);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
