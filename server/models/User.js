import { Schema, model } from "mongoose";

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
});

export default model("User", userSchema);
