const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");
const auth = require("../middleware/auth");

router.post("/", auth, complaintController.createComplaint);
router.get("/my", auth, complaintController.getMyComplaints);

module.exports = router;
