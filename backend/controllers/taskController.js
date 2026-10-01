const { Task } = require("../models");

exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      priority,
      category,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: "Title and date are required",
      });
    }

    const task = await Task.create({
      student: req.user.id,
      title,
      description,
      date,
      startTime: startTime || "",
      endTime: endTime || "",
      priority: priority || "Medium",
      category: category || "Study",
    });

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const filter = {
      student: req.user.id,
    };

    if (req.query.date) {
      filter.date = req.query.date;
    }

    if (req.query.completed !== undefined) {
      filter.completed = req.query.completed === "true";
    }

    const tasks = await Task.find(filter).sort({
      date: 1,
      startTime: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        student: req.user.id,
      },
      req.body,
      {
        new: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      student: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      message: "Task deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
