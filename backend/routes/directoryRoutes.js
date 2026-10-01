const express = require("express");
const router = express.Router();
const directoryController = require("../controllers/directoryController");
const auth = require("../middleware/auth");

router.get("/search", auth, directoryController.searchDirectory);
router.get("/", auth, directoryController.getDirectory);

module.exports = router;
