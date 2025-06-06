import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import admin from "firebase-admin";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { sendWelcomeNotification } from "./notificationController.js";

if (!process.env.BREVO_EMAIL || !process.env.BREVO_SMTP_KEY) {
  console.error("Error: Brevo credentials are missing or invalid:", {
    BREVO_EMAIL: process.env.BREVO_EMAIL,
    BREVO_SMTP_KEY: process.env.BREVO_SMTP_KEY ? "[REDACTED]" : "[MISSING]",
  });
  process.exit(1); 
}

const transporter = nodemailer.createTransport({
  host: "YOUR_HOST_ID",
  port: 587,
  secure: false,
  auth: {
    user: "YOUR_USER_ID",
    pass: process.env.BREVO_SMTP_KEY,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Brevo SMTP verification failed:", {
      message: error.message,
      code: error.code,
      response: error.response,
      smtpUser: process.env.BREVO_EMAIL,
      smtpPass: process.env.BREVO_SMTP_KEY,
    });
  } else {
    console.log("Brevo SMTP ready");
  }
});

const serviceAccountKey = JSON.parse(
  fs.readFileSync(
    "./gossips-app-firebase-adminsdk-fbsvc-5d6de228ce.json",
    "utf8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

const generateUniqueUsername = async (baseUsername) => {
  let username = baseUsername;
  let count = 1;
  while (await User.findOne({ username })) {
    username = `${baseUsername}${count}`;
    count++;
  }
  return username;
};

export const signupUser = async (req, res) => {
  let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.googleId && !existingUser.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        existingUser.password = hashedPassword;
        existingUser.name = name || existingUser.name;
        await existingUser.save();

        const token = jwt.sign(
          { id: existingUser._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

        return res.status(200).json({
          message: "Account updated successfully",
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          username: existingUser.username,
          profilePic: existingUser.profilePic,
          token,
        });
      }

      return res.status(400).json({ message: "User already exists" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (!email.match(emailRegex)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (!password.match(passwordRegex)) {
      return res.status(400).json({
        message:
          "Password must be between 6 to 20 characters and contain at least one numeric digit, one uppercase, and one lowercase letter",
      });
    }

    const baseUsername = email.split("@")[0];
    const username = await generateUniqueUsername(baseUsername);

    const profilePic =
      "https://cdn.vectorstock.com/i/500p/66/13/default-avatar-profile-icon-social-media-user-vector-49816613.jpg";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      username,
      profilePic,
    });

    await newUser.save();

    await sendWelcomeNotification(newUser._id);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "User registered successfully",
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      profilePic: newUser.profilePic,
      token,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email && !username) {
      return res.status(400).json({ error: "Username or email is required" });
    }

    const query = {};
    if (email) query.email = email;
    if (username) query.username = username;

    let user = await User.findOne(query)
      .populate("followers", "username")
      .populate("following", "username")
      .populate("savedPosts");

    if (!user) {
      return res
        .status(400)
        .json({ error: "User not found. Please register." });
    }

    if (user.googleId && !user.password) {
      return res.status(400).json({
        error: "Please set up a password first",
        needPasswordSetup: true,
      });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      bio: user.bio,
      link: user.link,
      isPrivate: user.isPrivate,
      isVerified: user.isVerified,
      followers: user.followers,
      following: user.following,
      savedPosts: user.savedPosts,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    let { token: idToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    let { email, name, picture } = decodedToken;

    if (picture) {
      picture = picture.replace("s96-c", "s1024-c");
    }

    let user = await User.findOne({ email })
      .populate("followers", "username")
      .populate("following", "username")
      .populate("savedPosts");

    let newUser = false;

    if (!user) {
      newUser = true;
      user = new User({
        name,
        email,
        googleId: decodedToken.uid,
        username: await generateUniqueUsername(email.split("@")[0]),
        profilePic:
          picture ||
          "https://cdn.vectorstock.com/i/500p/66/13/default-avatar-profile-icon-social-media-user-vector-49816613.jpg",
      });
    } else {
      user.googleId = decodedToken.uid;
      user.profilePic = picture || user.profilePic;
    }

    await user.save();

    let token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      token,
      newUser,
      bio: user.bio,
      link: user.link,
      isPrivate: user.isPrivate,
      isVerified: user.isVerified,
      followers: user.followers,
      following: user.following,
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ error: "User with this email does not exist" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    if (!process.env.BREVO_EMAIL || !process.env.BREVO_SMTP_KEY) {
      throw new Error("Brevo credentials are missing or invalid");
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is not defined");
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.BREVO_EMAIL,
      to: email,
      subject: "Gossips Password Reset",
      html: `
        <p>You requested a password reset for your Gossips account.</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Detailed error in forgotPassword:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      smtpUser: process.env.BREVO_EMAIL ? "[SET]" : "[MISSING]",
      smtpPass: process.env.BREVO_SMTP_KEY ? "[REDACTED]" : "[MISSING]",
    });
    res
      .status(500)
      .json({ error: "Failed to send reset link", details: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!password.match(passwordRegex)) {
      return res.status(400).json({
        error:
          "Password must be between 6 to 20 characters and contain at least one numeric digit, one uppercase, and one lowercase letter",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res
      .status(500)
      .json({ error: "Failed to reset password", details: error.message });
  }
};
