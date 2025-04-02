import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js"
import cors from "cors";
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();
const app = express();
app.use(express.json()); 
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {

  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of connectedUsers) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

export { io, connectedUsers };

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/posts", postRoutes);
app.use("/reply", commentRoutes);
app.use("/notification", notificationRoutes);

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Use server.listen instead of app.listen
server.listen(5000, '192.168.153.133', () => {
  console.log('Server running on port 5000 at 192.168.153.133');
});