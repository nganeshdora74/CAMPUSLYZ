const { MessMenu, MessInventory, Notification } = require("../models");

/**
 * Get Mess Dashboard Stats
 */
exports.getMessStats = async (req, res) => {
  try {
    const lowStockCount = await MessInventory.countDocuments({
      status: "low_stock",
    });

    res.json({
      success: true,
      totalStudents: 450,
      mealsToday: 386,
      lowStock: lowStockCount || 3,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Weekly Mess Menu
 */
exports.getMenu = async (req, res) => {
  try {
    let menus = await MessMenu.find();

    if (menus.length === 0) {
      const defaultMenus = [
        {
          day: "Monday",
          breakfast: ["Idli & Sambar", "Chutney", "Tea / Coffee"],
          lunch: ["Rice", "Dal Tadka", "Paneer Butter Masala", "Curd"],
          snacks: ["Samosa", "Tea"],
          dinner: ["Roti", "Mix Veg", "Jeera Rice", "Dal Fry", "Gulab Jamun"],
        },
        {
          day: "Tuesday",
          breakfast: ["Aloo Paratha", "Curd", "Pickle", "Tea"],
          lunch: ["Rice", "Rajma", "Aloo Gobi", "Salad"],
          snacks: ["Veg Cutlet", "Coffee"],
          dinner: ["Roti", "Paneer Do Pyaza", "Rice", "Dal Makhani"],
        },
        {
          day: "Wednesday",
          breakfast: ["Poha", "Boiled Egg / Banana", "Tea"],
          lunch: ["Rice", "Chole", "Bhature / Roti", "Boondi Raita"],
          snacks: ["Biscuits", "Tea"],
          dinner: ["Egg Curry / Shahi Paneer", "Roti", "Jeera Rice", "Dal"],
        },
        {
          day: "Thursday",
          breakfast: ["Dosa", "Sambar", "Coconut Chutney", "Tea"],
          lunch: ["Rice", "Dal Palak", "Bhindi Masala", "Curd"],
          snacks: ["Pakora", "Tea"],
          dinner: ["Roti", "Dum Aloo", "Fried Rice", "Dal Fry"],
        },
        {
          day: "Friday",
          breakfast: ["Upma", "Vada", "Sambar", "Tea"],
          lunch: ["Veg Biryani", "Mirchi Ka Salan", "Raita"],
          snacks: ["Sandwich", "Coffee"],
          dinner: ["Roti", "Malai Kofta", "Rice", "Dal Tadka", "Ice Cream"],
        },
        {
          day: "Saturday",
          breakfast: ["Puri Bhaji", "Halwa", "Tea"],
          lunch: ["Rice", "Kadhi Pakora", "Aloo Jeera", "Papad"],
          snacks: ["Bhel Puri", "Tea"],
          dinner: ["Roti", "Mix Veg Curry", "Rice", "Dal"],
        },
        {
          day: "Sunday",
          breakfast: ["Masala Dosa", "Filter Coffee", "Chutney"],
          lunch: ["Special Chicken / Paneer Biryani", "Raita", "Sweet"],
          snacks: ["Cake / Cookies", "Tea"],
          dinner: ["Roti", "Dal Makhani", "Jeera Rice", "Kheer"],
        },
      ];
      await MessMenu.insertMany(defaultMenus);
      menus = await MessMenu.find();
    }

    res.json({ success: true, count: menus.length, menus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Menu & Broadcast Notification
 */
exports.updateMenu = async (req, res) => {
  try {
    const { day, mealType, items } = req.body;

    if (!day || !mealType) {
      return res.status(400).json({ success: false, message: "Day and mealType are required" });
    }

    const menu = await MessMenu.findOneAndUpdate(
      { day },
      { [mealType]: Array.isArray(items) ? items : [items], updatedAt: new Date() },
      { new: true, upsert: true }
    );

    const menuString = Array.isArray(items) ? items.join(", ") : items;

    // 1. Outgoing Notification for Mess Manager
    await Notification.create({
      title: `Menu Updated: ${day} ${mealType}`,
      body: `Updated items: ${menuString}`,
      type: "mess",
      category: "Mess",
      senderName: "Mess Manager",
      senderRole: "mess_manager",
      target: "Hostel Students",
      status: "sent",
    });

    // 2. Incoming Notification for Hostellers
    await Notification.create({
      title: `🍽️ Mess Menu Update: ${day} ${mealType}`,
      body: `Today's ${mealType} menu has been updated: ${menuString}`,
      type: "mess",
      category: "Mess",
      senderName: "Mess Administration",
      senderRole: "mess_manager",
      target: "Hostel Students",
      status: "sent",
    });

    res.json({
      success: true,
      message: "Notification sent successfully! Menu updated & students notified.",
      menu,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Mess Inventory
 */
exports.getInventory = async (req, res) => {
  try {
    let inventory = await MessInventory.find();

    if (inventory.length === 0) {
      const defaultInventory = [
        { itemName: "Basmati Rice", category: "Grains", quantity: 150, unit: "kg", minThreshold: 50, status: "in_stock" },
        { itemName: "Toor Dal", category: "Pulses", quantity: 18, unit: "kg", minThreshold: 20, status: "low_stock" },
        { itemName: "Sunflower Oil", category: "Cooking Essentials", quantity: 45, unit: "L", minThreshold: 30, status: "in_stock" },
        { itemName: "Paneer", category: "Dairy", quantity: 8, unit: "kg", minThreshold: 15, status: "low_stock" },
        { itemName: "Potatoes", category: "Vegetables", quantity: 80, unit: "kg", minThreshold: 30, status: "in_stock" },
        { itemName: "Onions", category: "Vegetables", quantity: 12, unit: "kg", minThreshold: 25, status: "low_stock" },
      ];
      await MessInventory.insertMany(defaultInventory);
      inventory = await MessInventory.find();
    }

    res.json({ success: true, count: inventory.length, inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send Mess Notice
 */
exports.sendMessNotice = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    // 1. Outgoing Notification for Mess Manager
    await Notification.create({
      title: `Mess Notice Published: ${title}`,
      body: message.slice(0, 80),
      type: "mess",
      category: "Mess",
      senderName: "Mess Manager",
      senderRole: "mess_manager",
      target: "Hostel Students",
      status: "sent",
    });

    // 2. Incoming Notification for Hostellers
    await Notification.create({
      title,
      body: message,
      type: "mess",
      category: "Mess",
      senderName: "Mess Committee",
      senderRole: "mess_manager",
      target: "Hostel Students",
      status: "sent",
    });

    res.status(201).json({
      success: true,
      message: "Notification sent successfully! Mess notice sent.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
