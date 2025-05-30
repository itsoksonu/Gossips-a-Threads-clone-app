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

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: "No unread notifications to mark" });
    }

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

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

    const welcomeMessage = `Hey ${newUser.name}! Welcome to Gossips. I hope you like this project. If so, please make sure to give it a star on GitHub and share your views on this app. Thanks.`;

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
