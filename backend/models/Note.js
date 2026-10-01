const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    subject: String,
    department: String,
    semester: Number,
    topic: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: String,
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const savedNoteSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
  },
  {
    timestamps: true,
  }
);

const Note = mongoose.model("Note", noteSchema);
const SavedNote = mongoose.model("SavedNote", savedNoteSchema);

module.exports = {
  Note,
  SavedNote,
};
