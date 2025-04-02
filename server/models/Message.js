import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  media: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default model("Message", MessageSchema);