import { Router } from "express";
import {
  setupProfile,
  getUserProfile,
  getFollowRequests,
  getUsers,
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest,
  followUser,
  unfollowUser,
  checkPendingRequestStatus,
  FollowingUsers,
  getReplies,
  getReposts,
  isFollowingMe,
  restrictUser,
  blockUser,
  reportUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.post("/profile-setup", protect, upload.single("profilePic"), setupProfile);
router.get("/users", protect, getUsers);
router.get("/following", protect, FollowingUsers);
router.get("/follow-requests", protect, getFollowRequests);
router.post("/follow-requests/:requestId/accept", protect, acceptFollowRequest);
router.post("/follow-requests/:requestId/reject", protect, rejectFollowRequest);
router.delete("/follow-request/:username", protect, cancelFollowRequest);
router.get("/pending-request/:username", protect, checkPendingRequestStatus);
router.post("/follow/:username", protect, followUser);
router.post("/unfollow/:username", protect, unfollowUser);
router.post("/restrict/:username", protect, restrictUser);
router.post("/block/:username", protect, blockUser);
router.post("/report/:username", protect, reportUser);
router.get('/is-following-me/:username', protect, isFollowingMe);
router.get("/:username/replies", protect, getReplies);
router.get("/:profileId/reposts", protect, getReposts);
router.get("/:username", protect, getUserProfile);

export default router;
