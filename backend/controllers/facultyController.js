const { Faculty } = require("../models");

exports.getFaculty = async (req, res) => {
  try {
    const filter = {
      status: "active",
    };

    if (req.query.department) {
      filter.department = req.query.department;
    }

    const data = await Faculty.find(filter).sort({
      name: 1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
