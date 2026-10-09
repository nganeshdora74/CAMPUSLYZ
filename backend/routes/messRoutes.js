const express = require("express");
const router = express.Router();
const messController = require("../controllers/messController");

router.get("/stats", messController.getMessStats);
router.get("/menu", messController.getMenu);
router.post("/menu", messController.updateMenu);
router.get("/inventory", messController.getInventory);
router.post("/notices", messController.sendMessNotice);

module.exports = router;
