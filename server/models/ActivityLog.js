import { Schema, model } from "mongoose";

const ActivityLogSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g., "created thread", "liked a thread"
    target: { type: Schema.Types.ObjectId, refPath: "targetModel" }, // Can reference any model
    targetModel: { type: String, enum: ["Post", "Comment", "User"] },
    createdAt: { type: Date, default: Date.now },
  });
  
  export default model("ActivityLog", ActivityLogSchema);
  