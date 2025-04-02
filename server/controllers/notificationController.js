import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalNotifications = await Notification.countDocuments({ user: userId });

    const notifications = await Notification.find({ user: userId })
      .populate("sender", "username name profilePic isVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      notifications,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalNotifications / limitNum),
        totalNotifications,
        hasNextPage: pageNum < Math.ceil(totalNotifications / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Function to send welcome notification (called during user signup)
export const sendWelcomeNotification = async (newUserId) => {
  try {
    const gossipsUser = await User.findOne({ username: "gossips" });
    if (!gossipsUser) {
      console.error("Gossips account not found");
      return;
    }

    const newUser = await User.findById(newUserId);
    if (!newUser) {
      console.error("New user not found");
      return;
    }

    const welcomeMessage = `Hey ${newUser.name}! Welcome to Gossips. I hope you like this project. If so, please make sure to give it a star on GitHub and share your views on Twitter. Thanks.`;

    const notification = new Notification({
      user: newUserId,
      sender: gossipsUser._id,
      type: "welcome",
      createdAt: new Date(),
      isRead: false,
    });

    await notification.save();
  } catch (error) {
    console.error("Error sending welcome notification:", error);
  }
};