const { Note, SavedNote } = require("../models");

exports.getNotes = async (req, res) => {
  try {
    const filter = {
      status: "active",
    };

    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.semester) {
      filter.semester = Number(req.query.semester);
    }

    const notes = await Note.find(filter).sort({
      createdAt: -1,
    });

    res.json(notes);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.saveNote = async (req, res) => {
  try {
    const exists = await SavedNote.findOne({
      student: req.user.id,
      note: req.params.id,
    });

    if (exists) {
      return res.status(400).json({
        message: "Note already saved",
      });
    }

    await SavedNote.create({
      student: req.user.id,
      note: req.params.id,
    });

    res.json({
      success: true,
      message: "Note saved successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getSavedNotes = async (req, res) => {
  try {
    const saved = await SavedNote.find({
      student: req.user.id,
    })
      .populate("note")
      .sort({
        createdAt: -1,
      });

    res.json(saved);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteSavedNote = async (req, res) => {
  try {
    await SavedNote.findOneAndDelete({
      student: req.user.id,
      note: req.params.id,
    });

    res.json({
      success: true,
      message: "Removed from saved notes",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
