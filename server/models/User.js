import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    default: "",
  },
  link: {
    type: String,
    default: "",
  },
  profilePic: {
    type: String,
    default: "",
  },
  token: String,
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPrivate: { type: Boolean, default: false },
  googleId: { type: String, unique: true, sparse: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  savedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  likedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  restricted: [{ type: Schema.Types.ObjectId, ref: "User" }],
  blocked: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

export default model("User", userSchema);
