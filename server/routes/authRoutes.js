import { Router } from "express";
import { signupUser, loginUser, googleLogin } from "../controllers/authController.js";
// import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", signupUser);  // User signup
router.post("/login", loginUser);        // User login
router.post("/googlelogin", googleLogin); // Google login

export default router;
