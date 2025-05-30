import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { deleteChat, getChats, getMessages, uploadChatMedia } from "../controllers/chatController.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/", protect, getChats);
router.post("/upload", protect, upload.single("file"), uploadChatMedia);
router.get("/messages/:username", protect, getMessages);
router.delete("/delete/:username", protect, deleteChat);

export default router;
