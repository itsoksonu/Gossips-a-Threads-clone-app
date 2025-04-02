import { Schema, model } from "mongoose";

const HashtagSchema = new Schema({
  tag: { type: String, required: true, unique: true },
  posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
});

export default model("Hashtag", HashtagSchema);
