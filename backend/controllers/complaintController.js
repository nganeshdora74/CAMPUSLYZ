const { User, Complaint } = require("../models");

exports.createComplaint = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const complaint = await Complaint.create({
      student: req.user.id,
      studentName: user.name,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      location: req.body.location || "",
    });

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

exports.getMyComplaints = async (req, res) => {
  try {
    const data = await Complaint.find({
      student: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
