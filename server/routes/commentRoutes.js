import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { deleteComment, getComments,  likeComment, replyOnPost, getComment, getRepliesForComment, getCommentsWithReplies, createNestedComment, repostComment } from "../controllers/commentController.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

router.post("/comment", protect, upload.array("media", 5), replyOnPost);
router.post("/nested-comment", protect, upload.array("media", 5), createNestedComment);
router.get("/replies/:postId", protect, getCommentsWithReplies);
router.get("/comments/replies/:commentId", protect, getRepliesForComment);
router.get("/comments/:postId", protect, getComments);
router.post("/:commentId/like", protect, likeComment);
router.delete("/:commentId", protect, deleteComment);
router.get("/:commentId", protect, getComment);
router.post("/:id/repost", protect, repostComment);

export default router;