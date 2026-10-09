const express = require("express");
const router = express.Router();
const passController = require("../controllers/passController");

router.post("/", passController.submitPass);
router.get("/", passController.getPasses);
router.put("/:id/status", passController.updatePassStatus);

module.exports = router;
