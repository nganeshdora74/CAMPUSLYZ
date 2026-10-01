const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const auth = require("../middleware/auth");

router.get("/my", auth, examController.getMyExams);

module.exports = router;
