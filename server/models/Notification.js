import { Schema, model } from "mongoose";

const NotificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "repost", "follow", "reply", "quote", "welcome"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  comment: { type: Schema.Types.ObjectId, ref: "Comment" },
  quotedPost: { type: Schema.Types.ObjectId, ref: "Post" },
  parent: { type: Schema.Types.ObjectId, ref: "Comment" },
});

export default model("Notification", NotificationSchema);
