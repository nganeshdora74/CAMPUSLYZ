const express = require("express");
const router = express.Router();
const facultyController = require("../controllers/facultyController");
const auth = require("../middleware/auth");

router.get("/", auth, facultyController.getFaculty);

module.exports = router;
