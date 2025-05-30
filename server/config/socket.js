import { Server } from "socket.io";
import Message from "../models/Message.js";
import User from "../models/User.js";

const connectedUsers = new Map();

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (!userId) {
        console.error("No userId provided for join event");
        return;
      }
      connectedUsers.set(userId.toString(), socket.id);
      socket.join(userId.toString());
      console.log(`User ${userId} joined with socket ID ${socket.id}`);
    });

    socket.on("sendMessage", async ({ senderId, receiverId, receiverUsername, content, media, createdAt }) => {
      try {
        if (!senderId || !receiverId) {
          throw new Error("Invalid senderId or receiverId");
        }
        const sender = await User.findById(senderId).select("username");
        if (!sender) throw new Error("Sender not found");
        const receiver = await User.findById(receiverId).select("_id username");
        if (!receiver) throw new Error("Receiver not found");

        const newMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          senderUsername: sender.username,
          receiverUsername: receiver.username,
          content: content || "",
          media: media || [],
          isRead: false,
          createdAt: createdAt || new Date(),
        });
        await newMessage.save();

        const messageObject = newMessage.toObject();
        const receiverSocketId = connectedUsers.get(receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", messageObject);
        }
        const senderSocketId = connectedUsers.get(senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("receiveMessage", messageObject);
        }
      } catch (error) {
        console.error("Error sending message:", error.message);
        socket.emit("error", { message: "Failed to send message", error: error.message });
      }
    });

    socket.on("markAsRead", async ({ messageId, receiverId }) => {
      try {
        const message = await Message.findByIdAndUpdate(messageId, { isRead: true }, { new: true });
        if (!message) throw new Error("Message not found");
        io.to(receiverId.toString()).emit("messageRead", { messageId });
        const senderSocketId = connectedUsers.get(message.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageRead", { messageId });
        }
      } catch (error) {
        console.error("Error marking message as read:", error.message);
        socket.emit("error", { message: "Failed to mark message as read", error: error.message });
      }
    });

    socket.on("deleteChat", async ({ userId, receiverId }) => {
      try {
        if (!userId || !receiverId) {
          throw new Error("Invalid userId or receiverId");
        }
        const receiver = await User.findById(receiverId).select("_id");
        if (!receiver) throw new Error("Receiver not found");

        await Message.deleteMany({
          $or: [
            { sender: userId, receiver: receiverId },
            { sender: receiverId, receiver: userId },
          ],
        });

        const receiverSocketId = connectedUsers.get(receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("chatDeleted", { userId });
        }
        const senderSocketId = connectedUsers.get(userId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("chatDeleted", { receiverId });
        }
      } catch (error) {
        console.error("Error deleting chat:", error.message);
        socket.emit("error", { message: "Failed to delete chat", error: error.message });
      }
    });

    socket.on("restrictUser", async ({ userId, restrictedUserId }) => {
      try {
        const restrictedUser = await User.findById(restrictedUserId).select("_id username");
        if (!restrictedUser) throw new Error("Restricted user not found");
        const userSocketId = connectedUsers.get(userId.toString());
        if (userSocketId) {
          io.to(userSocketId).emit("userRestricted", { restrictedUserId, username: restrictedUser.username });
        }
      } catch (error) {
        console.error("Error notifying restricted user:", error.message);
        socket.emit("error", { message: "Failed to notify restriction", error: error.message });
      }
    });

    socket.on("blockUser", async ({ userId, blockedUserId }) => {
      try {
        const blockedUser = await User.findById(blockedUserId).select("_id username");
        if (!blockedUser) throw new Error("Blocked user not found");
        const blockedSocketId = connectedUsers.get(blockedUserId.toString());
        if (blockedSocketId) {
          io.to(blockedSocketId).emit("userBlocked", { blockerId: userId });
        }
        const userSocketId = connectedUsers.get(userId.toString());
        if (userSocketId) {
          io.to(userSocketId).emit("userBlocked", { blockedUserId, username: blockedUser.username });
        }
      } catch (error) {
        console.error("Error notifying blocked user:", error.message);
        socket.emit("error", { message: "Failed to notify block", error: error.message });
      }
    });

    socket.on("reportUser", async ({ userId, reportedUserId }) => {
      try {
        const reportedUser = await User.findById(reportedUserId).select("_id username");
        if (!reportedUser) throw new Error("Reported user not found");
        const userSocketId = connectedUsers.get(userId.toString());
        if (userSocketId) {
          io.to(userSocketId).emit("userReported", { reportedUserId, username: reportedUser.username });
        }
      } catch (error) {
        console.error("Error notifying reported user:", error.message);
        socket.emit("error", { message: "Failed to notify report", error: error.message });
      }
    });

    socket.on("disconnect", () => {
      for (let [userId, socketId] of connectedUsers) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return { io, connectedUsers };
};

export default setupSocket;
