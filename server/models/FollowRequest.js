import { Schema, model } from "mongoose";

const followRequestSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

followRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export default model("FollowRequest", followRequestSchema);
