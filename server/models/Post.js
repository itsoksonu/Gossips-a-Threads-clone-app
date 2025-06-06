import { Schema, model } from "mongoose";

const postSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    maxlength: 500,
  },
  icon: {
    type: String,
    default: "",
  },
  media: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
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
  replies: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  reposts: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      repostedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  parentGossip: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },
  quotedPost: { type: Schema.Types.ObjectId, ref: "Post", default: null },
  quotedComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  isQuoteRepost: { type: Boolean, default: false },
  isQuoteComment: { type: Boolean, default: false },
  views: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isDraft: {
    type: Boolean,
    default: false,
  },
});

export default model("Post", postSchema);
