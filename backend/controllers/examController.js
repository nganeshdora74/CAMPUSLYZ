const { User, Exam } = require("../models");

exports.getMyExams = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const data = await Exam.find({
      department: user.department,
      semester: user.semester,
    }).sort({
      examDate: 1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
