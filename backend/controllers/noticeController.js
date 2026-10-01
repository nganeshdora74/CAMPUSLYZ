const { Notice } = require("../models");

exports.getNotices = async (req, res) => {
  try {
    const data = await Notice.find({
      status: "active",
    })
      .sort({
        isPinned: -1,
        createdAt: -1,
      })
      .limit(30);

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
