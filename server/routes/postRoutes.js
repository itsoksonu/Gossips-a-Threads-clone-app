import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  likePost,
  createPost,
  getHomeFeed,
  getUserPosts,
  getPost,
  deletePost,
  repostPost,
  getPostLikes,
  getPostReposts,
  getPostQuotes,
  getPostActivity,
  getSavedPosts,
  toggleSavePost,
  getDrafts,
  saveDraft,
  deleteDraft,
  getLikedPosts,
} from "../controllers/postController.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

router.get("/feed", protect, getHomeFeed);
router.post("/create", protect, upload.array("media", 5), createPost);
router.get("/saved-posts", protect, getSavedPosts);
router.get("/liked-posts", protect, getLikedPosts);
router.post("/save-draft", protect, upload.array("media", 5), saveDraft);
router.get("/drafts", protect, getDrafts);
router.post("/:id/like", protect, likePost);
router.post("/:id/repost", protect, repostPost);
router.delete("/:id", protect, deletePost);
router.get("/:username", protect, getUserPosts);
router.delete("/draft/:id", protect, deleteDraft);
router.get("/post/:postId", protect, getPost);
router.get("/likes/:postId", protect, getPostLikes);
router.get("/reposts/:postId", protect, getPostReposts);
router.get("/quotes/:postId", protect, getPostQuotes);
router.get("/activity/:postId", protect, getPostActivity);
router.post("/save/:postId", protect, toggleSavePost);

export default router;
