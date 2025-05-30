import { uploadToCloudinary } from "../config/cloudinary.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

export const replyOnPost = async (req, res) => {
  try {
    const { content, postId, parentId } = req.body;
    const userId = req.user._id;

    if (
      (!content || content.trim() === "") &&
      (!req.files || req.files.length === 0)
    ) {
      return res
        .status(400)
        .json({ error: "Comment must have content or media" });
    }

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const newComment = {
      content: content || "",
      post: postId,
      author: userId,
      parent: parentId || null,
    };

    if (req.files && req.files.length > 0) {
      const mediaUrls = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        mediaUrls.push(result.secure_url);
      }
      newComment.media = mediaUrls;
    }

    const comment = await Comment.create(newComment);

    await Post.findByIdAndUpdate(postId, {
      $push: { replies: comment._id },
      $inc: { replyCount: 1 },
    });

    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { replyCount: 1 },
      });
    }

    const post = await Post.findById(postId);
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (parentComment.author.toString() !== userId.toString()) {
        const notification = new Notification({
          user: parentComment.author,
          sender: userId,
          type: "reply",
          post: postId,
          comment: comment._id,
          parent: parentId,
          createdAt: new Date(),
          isRead: false,
        });
        await notification.save();
      }
    } else if (post.author.toString() !== userId.toString()) {
      const notification = new Notification({
        user: post.author,
        sender: userId,
        type: "reply",
        post: postId,
        comment: comment._id,
        createdAt: new Date(),
        isRead: false,
      });
      await notification.save();
    }

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "username profilePic isVerified"
    );

    res.status(201).json({ comment: populatedComment });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const createNestedComment = async (req, res) => {
  try {
    const { content, commentId, parentId } = req.body;
    const userId = req.user._id;

    if (
      (!content || content.trim() === "") &&
      (!req.files || req.files.length === 0)
    ) {
      return res
        .status(400)
        .json({ error: "Comment must have content or media" });
    }

    if (!commentId) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    const originalComment = await Comment.findById(commentId);
    if (!originalComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const postId = originalComment.post;

    const newComment = {
      content: content || "",
      post: postId,
      author: userId,
      parent: parentId || commentId,
    };

    if (req.files && req.files.length > 0) {
      const mediaUrls = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        mediaUrls.push(result.secure_url);
      }
      newComment.media = mediaUrls;
    }

    const comment = await Comment.create(newComment);

    await Comment.findByIdAndUpdate(newComment.parent, {
      $inc: { replyCount: 1 },
    });

    await Post.findByIdAndUpdate(postId, {
      $inc: { replyCount: 1 },
    });

    const parentComment = await Comment.findById(newComment.parent);
    if (parentComment.author.toString() !== userId.toString()) {
      const notification = new Notification({
        user: parentComment.author,
        sender: userId,
        type: "reply",
        post: postId,
        comment: comment._id,
        parent: newComment.parent,
        createdAt: new Date(),
        isRead: false,
      });
      await notification.save();
    }

    const post = await Post.findById(postId);
    if (
      !parentComment.parent &&
      post.author.toString() !== userId.toString() &&
      post.author.toString() !== parentComment.author.toString()
    ) {
      const postNotification = new Notification({
        user: post.author,
        sender: userId,
        type: "reply",
        post: postId,
        comment: comment._id,
        createdAt: new Date(),
        isRead: false,
      });
      await postNotification.save();
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "username profilePic isVerified")
      .populate({
        path: "parent",
        select: "_id content author",
        populate: {
          path: "author",
          select: "username profilePic isVerified",
        },
      });

    res.status(201).json({ comment: populatedComment });
  } catch (error) {
    console.error("Error creating nested comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getCommentsWithReplies = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const topLevelComments = await Comment.find({
      post: postId,
      parent: null,
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate({
        path: "likes.user",
        select: "username profilePic",
      })
      .lean();

    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await Comment.find({
          parent: comment._id,
        })
          .sort({ createdAt: 1 })
          .limit(5)
          .populate("author", "username name bio profilePic isVerified isPrivate followers")
          .populate({
            path: "likes.user",
            select: "username profilePic",
          })
          .lean();

        return {
          ...comment,
          replies,
          hasMoreReplies: comment.replyCount > replies.length,
        };
      })
    );

    res.status(200).json({
      comments: commentsWithReplies,
      total: await Comment.countDocuments({ post: postId, parent: null }),
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getRepliesForComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!commentId) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    const comments = await Comment.find({
      parent: commentId,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate({
        path: "likes.user",
        select: "username profilePic",
      })
      .lean();

    const total = await Comment.countDocuments({ parent: commentId });

    res.status(200).json({
      comments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalComments: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching replies:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, parentId, parentOnly = false } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      post: postId,
      parent: parentOnly ? null : parentId || null,
    };

    const total = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate({
        path: "likes.user",
        select: "username profilePic",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      comments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalComments: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isLiked = comment.likes.some(
      (like) => like.user.toString() === userId.toString()
    );

    if (isLiked) {
      comment.likes = comment.likes.filter(
        (like) => like.user.toString() !== userId.toString()
      );
    } else {
      comment.likes.push({
        user: userId,
        likedAt: new Date(),
      });
    }

    await comment.save();

    if (!isLiked && comment.author.toString() !== userId.toString()) {
      const notification = new Notification({
        user: comment.author,
        sender: userId,
        type: "like",
        post: comment.post,
        comment: commentId,
        createdAt: new Date(),
        isRead: false,
      });
      await notification.save();
    }

    const populatedComment = await Comment.findById(commentId)
      .populate("author", "username profilePic isVerified")
      .populate({
        path: "parent",
        select: "_id content author",
        populate: {
          path: "author",
          select: "username profilePic isVerified",
        },
      });

    res.status(200).json({
      message: isLiked
        ? "Comment unliked successfully"
        : "Comment liked successfully",
      liked: !isLiked,
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const getNestedCommentIds = async (parentId) => {
      const nestedComments = await Comment.find({ parent: parentId });
      let commentIds = [];
      for (const nestedComment of nestedComments) {
        commentIds.push(nestedComment._id);
        const childCommentIds = await getNestedCommentIds(nestedComment._id);
        commentIds = commentIds.concat(childCommentIds);
      }
      return commentIds;
    };

    const nestedCommentIds = await getNestedCommentIds(commentId);
    const allCommentIds = [commentId, ...nestedCommentIds];

    const totalCommentsDeleted = allCommentIds.length;

    await Comment.deleteMany({ _id: { $in: allCommentIds } });

    await Notification.deleteMany({
      comment: { $in: allCommentIds }
    });

    await Post.findByIdAndUpdate(comment.post, {
      $inc: { replyCount: -totalCommentsDeleted },
    });

    if (comment.parent) {
      await Comment.findByIdAndUpdate(comment.parent, {
        $inc: { replyCount: -totalCommentsDeleted },
      });
    }

    res.json({ message: "Comment and its replies deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "name username bio profilePic isVerified isPrivate followers",
        },
      })
      .populate("author", "name username bio profilePic isVerified isPrivate followers");

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.status(200).json(comment);
  } catch (error) {
    console.error("Error Fetching Comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const repostComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId).populate("author");
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const existingRepost = comment.reposts.find(
      (repost) => repost.user.toString() === userId
    );

    if (existingRepost) {
      comment.reposts = comment.reposts.filter(
        (repost) => repost.user.toString() !== userId
      );
      await comment.save();
      return res.status(200).json({
        message: "Repost removed",
        comment: comment,
      });
    } else {
      comment.reposts.push({ user: userId, repostedAt: new Date() });
      await comment.save();
      return res.status(200).json({
        message: "Comment reposted",
        comment: comment,
      });
    }
  } catch (error) {
    console.error("Error reposting comment:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
