const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const auth = require("../middleware/auth");

router.get("/", auth, videoController.getVideos);
router.get("/saved/my", auth, videoController.getSavedVideos);
router.get("/:id", auth, videoController.getVideoById);
router.post("/save/:id", auth, videoController.saveVideo);
router.delete("/save/:id", auth, videoController.deleteSavedVideo);

module.exports = router;
