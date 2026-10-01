const { Directory } = require("../models");

exports.getDirectory = async (req, res) => {
  try {
    const filter = {
      status: "active",
    };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const data = await Directory.find(filter).sort({
      name: 1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.searchDirectory = async (req, res) => {
  try {
    const keyword = req.query.q || "";

    const data = await Directory.find({
      status: "active",
      $or: [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          keywords: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }).limit(20);

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
