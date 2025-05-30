import { Schema, model } from "mongoose";

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["like", "reply", "repost", "quote", "quote_comment", "follow", "welcome"],
    required: true,
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
  },
  quotedPost: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  quotedComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

export default model("Notification", notificationSchema);
