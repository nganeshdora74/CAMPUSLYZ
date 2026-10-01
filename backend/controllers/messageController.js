const { User, Message } = require("../models");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId || !text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Receiver and message are required",
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      text: text.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "name email role")
      .populate("receiver", "name email role");

    res.json({
      success: true,
      message: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const messages = await Message.find({
      $or: [
        {
          sender: req.user.id,
          receiver: req.params.userId,
        },
        {
          sender: req.params.userId,
          receiver: req.user.id,
        },
      ],
    })
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({
        createdAt: 1,
      });

    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user.id,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMessageUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: {
        $ne: req.user.id,
      },
    }).select("name email role department semester section");

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.id,
        receiver: req.user.id,
      },
      {
        read: true,
      },
      {
        new: true,
      }
    );

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
