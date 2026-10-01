const { Video, SavedVideo } = require("../models");

exports.getVideos = async (req, res) => {
  try {
    const filter = {};

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.semester) {
      filter.semester = Number(req.query.semester);
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const videos = await Video.find(filter).sort({
      createdAt: -1,
    });

    res.json(videos);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.saveVideo = async (req, res) => {
  try {
    const exists = await SavedVideo.findOne({
      student: req.user.id,
      video: req.params.id,
    });

    if (exists) {
      return res.status(400).json({
        message: "Video already saved",
      });
    }

    await SavedVideo.create({
      student: req.user.id,
      video: req.params.id,
    });

    res.json({
      success: true,
      message: "Video saved successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getSavedVideos = async (req, res) => {
  try {
    const saved = await SavedVideo.find({
      student: req.user.id,
    }).populate("video");

    res.json(saved);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteSavedVideo = async (req, res) => {
  try {
    await SavedVideo.findOneAndDelete({
      student: req.user.id,
      video: req.params.id,
    });

    res.json({
      success: true,
      message: "Removed from saved",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
