import "./config/config.js";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import cors from "cors";
import { createServer } from "http";
import setupSocket from "./config/socket.js"; 

const app = express();
app.use(express.json());
app.use(cors());
const server = createServer(app);

const { io, connectedUsers } = setupSocket(server);
export { io, connectedUsers };

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/posts", postRoutes);
app.use("/reply", commentRoutes);
app.use("/notification", notificationRoutes);
app.use("/chats", messageRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

server.listen(5000, () => {
  console.log("Server running on port 5000 at 192.168.234.133");
});

