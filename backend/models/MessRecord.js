const mongoose = require("mongoose");

const messMenuSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    breakfast: {
      type: [String],
      default: [],
    },
    lunch: {
      type: [String],
      default: [],
    },
    snacks: {
      type: [String],
      default: [],
    },
    dinner: {
      type: [String],
      default: [],
    },
    special: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: String,
      default: "Mess Manager",
    },
  },
  {
    timestamps: true,
  }
);

const messInventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "Grocery",
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      default: "kg",
    },
    minThreshold: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },
    lastRestocked: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = {
  MessMenu: mongoose.model("MessMenu", messMenuSchema),
  MessInventory: mongoose.model("MessInventory", messInventorySchema),
};
