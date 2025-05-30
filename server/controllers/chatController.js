import Message from "../models/Message.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

export const getMessages = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverUsername = req.params.username;
    const receiver = await User.findOne({ username: receiverUsername }).select("_id");
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiver._id },
        { sender: receiver._id, receiver: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages", details: error.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const chats = [];
    const seenUsers = new Set();

    messages.forEach((message) => {
      const otherUserId = message.sender.toString() === userId ? message.receiver : message.sender;
      if (!seenUsers.has(otherUserId.toString())) {
        seenUsers.add(otherUserId.toString());
        chats.push({
          user: { _id: otherUserId },
          latestMessage: message,
        });
      }
    });

    const userIds = [...seenUsers];
    const users = await User.find({ _id: { $in: userIds } }).select("username name profilePic isVerified");
    if (!users || users.length === 0) {
      throw new Error("No users found for the given IDs");
    }
    const chatsWithUsers = chats.map((chat) => ({
      user: users.find((u) => u._id.toString() === chat.user._id.toString()) || { _id: chat.user._id },
      latestMessage: chat.latestMessage,
    }));

    res.status(200).json({ chats: chatsWithUsers });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats", details: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const receiverUsername = req.params.username;
    const receiver = await User.findOne({ username: receiverUsername }).select("_id");
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    await Message.deleteMany({
      $or: [
        { sender: userId, receiver: receiver._id },
        { sender: receiver._id, receiver: userId },
      ],
    });

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat", details: error.message });
  }
};

export const uploadChatMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.path, "chat_media");
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Error uploading chat media to Cloudinary:", error);
    res.status(500).json({ error: "Failed to upload media", details: error.message });
  }
};
