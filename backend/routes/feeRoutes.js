const express = require("express");
const router = express.Router();
const feeController = require("../controllers/feeController");

router.get("/stats", feeController.getFeeStats);
router.get("/students", feeController.getStudentsFees);
router.post("/pay", feeController.recordPayment);
router.post("/reminder", feeController.sendFeeReminder);

module.exports = router;
