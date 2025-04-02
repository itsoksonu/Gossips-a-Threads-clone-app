import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {likePost, createPost,  getHomeFeed, getUserPosts,  getPost, deletePost, repostPost, getPostLikes, getPostReposts, getPostQuotes, getPostActivity, getSavedPosts, toggleSavePost, } from "../controllers/postController.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

router.get("/feed", protect, getHomeFeed); 
router.post("/create", protect, upload.array("media", 5), createPost);
router.get("/saved-posts", protect, getSavedPosts);
router.post("/:id/like", protect, likePost); 
router.post("/:id/repost", protect, repostPost); 
router.delete("/:id", protect, deletePost);
router.get("/:username", protect, getUserPosts);
router.get("/post/:postId", protect, getPost); 
router.get("/likes/:postId", protect, getPostLikes);
router.get("/reposts/:postId", protect, getPostReposts);
router.get("/quotes/:postId", protect, getPostQuotes);
router.get("/activity/:postId", protect, getPostActivity);
router.post("/save/:postId", protect, toggleSavePost);


export default router;