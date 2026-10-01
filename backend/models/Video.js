const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["live", "recorded"],
      required: true,
    },
    subject: String,
    department: String,
    semester: Number,
    faculty: String,
    videoUrl: String,
    meetingLink: String,
    scheduledAt: Date,
    thumbnail: String,
    duration: String,
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "recorded"],
      default: "upcoming",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const savedVideoSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);
const SavedVideo = mongoose.model("SavedVideo", savedVideoSchema);

module.exports = {
  Video,
  SavedVideo,
};
