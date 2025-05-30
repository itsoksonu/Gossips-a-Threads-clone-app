import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  senderUsername: { type: String, required: true }, 
  receiverUsername: { type: String, required: true }, 
  content: { type: String},
  isRead: { type: Boolean, default: false },
  media: [{ type: { type: String }, url: { type: String } }],
  createdAt: { type: Date, default: Date.now },
});

export default model("Message", MessageSchema);
