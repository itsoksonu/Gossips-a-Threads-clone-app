import { Router } from "express";
import { signupUser, loginUser, googleLogin, forgotPassword, resetPassword } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signupUser);  
router.post("/login", loginUser);       
router.post("/googlelogin", googleLogin); 
router.post("/forgot-password", forgotPassword); 
router.post("/reset-password", resetPassword);

export default router;
