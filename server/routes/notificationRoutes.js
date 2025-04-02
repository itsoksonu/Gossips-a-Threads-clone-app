import { Router } from "express";
import { getUserNotifications, markNotificationAsRead } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/notifications", protect, getUserNotifications);
router.put("/notifications/:notificationId/read", protect, markNotificationAsRead);

export default router;