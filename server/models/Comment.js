import { Schema, model } from "mongoose";

const commentSchema = new Schema({
  content: {
    type: String,
    required: false,
    maxlength: 500,
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  media: { type: [String], default: [] },
  likes: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      likedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  parent: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  reposts: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      repostedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default model("Comment", commentSchema);