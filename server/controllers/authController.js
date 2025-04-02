import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import admin from "firebase-admin";
import fs from "fs";
import { sendWelcomeNotification } from "./notificationController.js";

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

        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

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
      details: error.message 
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
      return res.status(400).json({ error: "User not found. Please register." });
    }

    if (user.googleId && !user.password) {
      return res.status(400).json({ 
        error: "Please set up a password first", 
        needPasswordSetup: true 
      });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const isMatch = bcrypt.compare(password, user.password);
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
        username: await generateUniqueUsername(email.split('@')[0]),
        profilePic: picture || "https://cdn.vectorstock.com/i/500p/66/13/default-avatar-profile-icon-social-media-user-vector-49816613.jpg",
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
      error: error.message 
    });
  }
};