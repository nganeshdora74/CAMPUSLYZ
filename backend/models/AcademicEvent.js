const mongoose = require("mongoose");

const academicEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "Holiday",
        "Exam",
        "Class",
        "Event",
        "Assignment",
        "Meeting",
        "Other",
      ],
      default: "Event",
    },
    location: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    semester: {
      type: Number,
      default: null,
    },
    isHoliday: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("AcademicEvent", academicEventSchema);
