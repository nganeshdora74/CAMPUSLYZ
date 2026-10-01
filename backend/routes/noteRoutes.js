const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const auth = require("../middleware/auth");

router.get("/", auth, noteController.getNotes);
router.get("/saved/my", auth, noteController.getSavedNotes);
router.get("/:id", auth, noteController.getNoteById);
router.post("/save/:id", auth, noteController.saveNote);
router.delete("/save/:id", auth, noteController.deleteSavedNote);

module.exports = router;
