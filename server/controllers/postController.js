import { uploadToCloudinary } from "../config/cloudinary.js";
import { StatusCodes } from "http-status-codes";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

export const createPost = async (req, res) => {
  try {
    const {
      content,
      icon,
      parentGossip,
      quotedPost,
      quotedComment,
      isQuoteRepost,
      isQuoteComment,
      isDraft,
    } = req.body;
    const userId = req.user.id;

    if (isDraft === "true") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Use save-draft endpoint for drafts",
      });
    }

    const newPost = {
      author: userId,
      content: content || "",
      icon: icon || "",
      parentGossip: parentGossip || null,
      quotedPost: quotedPost || null,
      quotedComment: quotedComment || null,
      isQuoteRepost: isQuoteRepost || false,
      isQuoteComment: isQuoteComment || false,
      views: [],
      isDraft: false,
    };

    if (req.files && req.files.length > 0) {
      const mediaUrls = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        mediaUrls.push(result.secure_url);
      }
      newPost.media = mediaUrls;
    }

    if (!content && !newPost.media?.length && !quotedComment && !quotedPost) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Post must have content, media, or a quote",
      });
    }

    const post = await Post.create(newPost);

    if (isQuoteRepost && quotedPost) {
      const originalPost = await Post.findById(quotedPost);
      if (originalPost && originalPost.author.toString() !== userId) {
        const notification = new Notification({
          user: originalPost.author,
          sender: userId,
          type: "quote",
          post: post._id,
          quotedPost: quotedPost,
          createdAt: new Date(),
          isRead: false,
        });
        await notification.save();
      }
    }

    if (isQuoteComment && quotedComment) {
      const originalComment = await Comment.findById(quotedComment).lean();
      if (originalComment && originalComment.author.toString() !== userId) {
        const notification = new Notification({
          user: originalComment.author,
          sender: userId,
          type: "quote_comment",
          post: post._id,
          quotedComment: quotedComment,
          createdAt: new Date(),
          isRead: false,
        });
        await notification.save();
      }
    }

    await User.findByIdAndUpdate(userId, { $push: { posts: post._id } });

    const populatedPost = await Post.findById(post._id)
      .populate(
        "author",
        "name username profilePic isVerified isPrivate followers"
      )
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "name username profilePic isVerified isPrivate followers",
        },
      })
      .populate({
        path: "quotedComment",
        select: "content media author createdAt post",
        populate: {
          path: "author",
          select: "name username profilePic isVerified isPrivate followers",
        },
      });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Post created successfully",
      post: { ...populatedPost.toObject(), viewCount: 0 },
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
};

export const saveDraft = async (req, res) => {
  try {
    const { content, quotedPost, isQuoteRepost } = req.body;
    const userId = req.user.id;

    const newDraft = {
      author: userId,
      content: content || "",
      quotedPost: quotedPost || null,
      isQuoteRepost: isQuoteRepost || false,
      isDraft: true,
      createdAt: new Date(),
    };

    if (req.files && req.files.length > 0) {
      const mediaUrls = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        mediaUrls.push(result.secure_url);
      }
      newDraft.media = mediaUrls;
    }

    if (!content && !newDraft.media?.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Draft must have content or media",
      });
    }

    const draft = await Post.create(newDraft);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Draft saved successfully",
      draft,
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to save draft",
      error: error.message,
    });
  }
};

export const getDrafts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalDrafts = await Post.countDocuments({
      author: userId,
      isDraft: true,
    });

    const drafts = await Post.find({ author: userId, isDraft: true })
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      drafts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalDrafts / limitNum),
        totalItems: totalDrafts,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch drafts", details: error.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const draft = await Post.findOne({
      _id: id,
      author: userId,
      isDraft: true,
    });
    if (!draft) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Draft not found" });
    }

    await Post.findByIdAndDelete(id);
    res.status(StatusCodes.OK).json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("Error deleting draft:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete draft",
      error: error.message,
    });
  }
};
export const getHomeFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { isDraft: false };

    if (type === "following") {
      const user = await User.findById(userId).populate("following");
      const followingIds = user.following.map((user) => user._id);
      query = { ...query, author: { $in: followingIds } };
    }

    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate("replies")
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .populate({
        path: "quotedComment",
        select: "content media author createdAt post",
        populate: {
          path: "author",
          select: "name username bio profilePic isVerified isPrivate followers",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const postsWithViewCount = posts.map((post) => ({
      ...post,
      viewCount: Array.isArray(post.views) ? post.views.length : 0,
    }));

    res.status(200).json({
      posts: postsWithViewCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPosts / limitNum),
        totalPosts,
        postsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPosts / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error in getHomeFeed:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch home feed", details: error.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const query = { author: user._id, isDraft: false };

    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .populate("author", "username name bio profilePic isVerified isPrivate followers")
      .populate("replies")
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .populate({
        path: "quotedComment",
        select: "content media author createdAt post",
        populate: {
          path: "author",
          select: "name username bio profilePic isVerified isPrivate followers",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const postsWithViewCount = posts.map((post) => ({
      ...post,
      viewCount: post.views.length,
    }));

    res.status(200).json({
      posts: postsWithViewCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPosts / limitNum),
        totalPosts,
        postsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPosts / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error in getUserPosts:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch user posts", details: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.some(
      (like) => like.user.toString() === userId.toString()
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (like) => like.user.toString() !== userId.toString()
      );
    } else {
      post.likes.push({
        user: userId,
        likedAt: new Date(),
      });
    }
    await post.save();

    if (!alreadyLiked && post.author.toString() !== userId.toString()) {
      const notification = new Notification({
        user: post.author,
        sender: userId,
        type: "like",
        post: postId,
        createdAt: new Date(),
        isRead: false,
      });
      await notification.save();
    }

    const updatedPost = await Post.findById(postId)
      .populate(
        "author",
        "name username profilePic isVerified isPrivate followers"
      )
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username profilePic isVerified isPrivate followers",
        },
      });

    res.status(200).json({
      message: alreadyLiked
        ? "Post unliked successfully"
        : "Post liked successfully",
      liked: !alreadyLiked,
      post: {
        ...updatedPost.toObject(),
        viewCount: updatedPost.views.length,
      },
    });
  } catch (error) {
    console.error("Error liking/unliking post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    const post = await Post.findById(postId)
      .populate(
        "author",
        "name username bio profilePic isVerified isPrivate followers"
      )
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .populate({
        path: "quotedComment",
        select: "content media author createdAt post",
        populate: {
          path: "author",
          select: "name username bio profilePic isVerified isPrivate followers",
        },
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (
      userId &&
      !post.views.some((view) => view.user.toString() === userId.toString())
    ) {
      post.views.push({
        user: userId,
        viewedAt: new Date(),
      });
      await post.save();
    }

    res.status(200).json({
      ...post.toObject(),
      viewCount: post.views.length,
    });
  } catch (error) {
    console.error("Error Fetching Post:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const deletePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    const deleteComments = async (postId, parentCommentIds = []) => {
      let commentIdsToDelete = [];

      if (postId) {
        const directComments = await Comment.find({ post: postId });
        commentIdsToDelete = directComments.map((comment) => comment._id);
      } else if (parentCommentIds.length > 0) {
        const nestedComments = await Comment.find({
          parent: { $in: parentCommentIds },
        });
        commentIdsToDelete = nestedComments.map((comment) => comment._id);
      }

      if (commentIdsToDelete.length === 0) return;

      await deleteComments(null, commentIdsToDelete);
      await Comment.deleteMany({ _id: { $in: commentIdsToDelete } });
    };

    await Notification.deleteMany({
      $or: [{ post: id }, { quotedPost: id }],
    });

    const reposts = await Post.find({
      content: post.content,
      isQuoteRepost: false,
      createdAt: { $gt: post.createdAt },
      _id: { $ne: post._id },
    });
    const repostIds = reposts.map((repost) => repost._id);

    for (const repostId of repostIds) {
      await deleteComments(repostId);
    }

    if (repostIds.length > 0) {
      await Post.deleteMany({ _id: { $in: repostIds } });
    }

    await deleteComments(id);

    await Post.findByIdAndDelete(id);

    res.status(200).json({
      message:
        "Post, its reposts, and all associated comments deleted successfully",
      deletedRepostCount: repostIds.length,
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      message: "Server error while deleting post and reposts",
      error: error.message,
    });
  }
};

export const repostPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const hasReposted = originalPost.reposts.some(
      (repost) => repost.user.toString() === userId.toString()
    );

    if (hasReposted) {
      originalPost.reposts = originalPost.reposts.filter(
        (repost) => repost.user.toString() !== userId.toString()
      );
      await originalPost.save();
      return res.status(200).json({
        message: "Repost removed successfully",
        post: {
          ...originalPost.toObject(),
          viewCount: originalPost.views.length,
        },
      });
    } else {
      originalPost.reposts.push({
        user: userId,
        repostedAt: new Date(),
      });
      await originalPost.save();

      if (originalPost.author.toString() !== userId.toString()) {
        const notification = new Notification({
          user: originalPost.author,
          sender: userId,
          type: "repost",
          createdAt: new Date(),
          post: originalPost._id,
          isRead: false,
        });
        await notification.save();
      }

      return res.status(201).json({
        message: "Post reposted successfully",
        post: {
          ...originalPost.toObject(),
          viewCount: originalPost.views.length,
        },
      });
    }
  } catch (error) {
    console.error("Error in repostPost:", error);
    res.status(500).json({
      message: "Something went wrong while processing repost",
      error: error.message,
    });
  }
};

export const getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const post = await Post.findById(postId).populate({
      path: "likes.user",
      select: "username name profilePic isVerified",
      options: { skip, limit: limitNum },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const totalLikes = post.likes.length;

    const usersWithTimestamps = post.likes
      .slice(skip, skip + limitNum)
      .map((like) => ({
        ...like.user.toObject(),
        likedAt: like.likedAt, 
      }));

    res.status(200).json({
      users: usersWithTimestamps,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalLikes / limitNum),
        totalItems: totalLikes,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching post likes:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getPostReposts = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const post = await Post.findById(postId).populate({
      path: "reposts.user",
      select: "username name profilePic isVerified repostedAt", 
      options: { skip, limit: limitNum },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const totalReposts = post.reposts.length;

    const reposts = post.reposts.slice(skip, skip + limitNum).map((repost) => ({
      ...repost.user.toObject(),
      repostedAt: repost.repostedAt,
    }));

    res.status(200).json({
      users: reposts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalReposts / limitNum),
        totalItems: totalReposts,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching post reposts:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getPostQuotes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalQuotes = await Post.countDocuments({ quotedPost: postId });

    const quotes = await Post.find({ quotedPost: postId })
      .populate(
        "author",
        "username name profilePic isVerified isPrivate followers"
      )
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username profilePic isVerified isPrivate followers",
        },
      })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      users: quotes.map((quote) => ({
        ...quote.author,
        content: quote.content,
        quotePostId: quote._id,
        createdAt: quote.createdAt,
      })),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalQuotes / limitNum),
        totalItems: totalQuotes,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching post quotes:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getPostActivity = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .populate({
        path: "likes.user",
        select: "username name profilePic isVerified followers following",
        populate: [
          { path: "followers", select: "username name profilePic" },
          { path: "following", select: "username name profilePic" },
        ],
      })
      .populate({
        path: "reposts.user",
        select: "username name profilePic isVerified followers following",
        populate: [
          { path: "followers", select: "username name profilePic" },
          { path: "following", select: "username name profilePic" },
        ],
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const quotes = await Post.find({ quotedPost: postId }).populate(
      "author",
      "username name profilePic isVerified followers following"
    );

    const activity = [];

    post.likes.forEach((like) => {
      activity.push({
        type: "like",
        user: like.user,
        timestamp: like.likedAt,
      });
    });

    post.reposts.forEach((repost) => {
      activity.push({
        type: "repost",
        user: repost.user,
        timestamp: repost.repostedAt,
      });
    });

    quotes.forEach((quote) => {
      activity.push({
        type: "quote",
        user: quote.author,
        content: quote.content,
        timestamp: quote.createdAt,
        quotePostId: quote._id,
      });
    });

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      activity,
    });
  } catch (error) {
    console.error("Error fetching post activity:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPostSaved = user.savedPosts.includes(postId);

    if (isPostSaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId
      );
      await user.save();
      return res.status(200).json({
        message: "Post unsaved successfully",
        savedPosts: user.savedPosts,
      });
    } else {
      user.savedPosts.push(postId);
      await user.save();
      return res.status(200).json({
        message: "Post saved successfully",
        savedPosts: user.savedPosts,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPosts = user.savedPosts.length;

    const posts = await Post.find({ _id: { $in: user.savedPosts } })
      .populate(
        "author",
        "username name bio profilePic isVerified isPrivate followers"
      )
      .populate("likes.user", "username profilePic")
      .populate("reposts.user", "username profilePic")
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean();

    const postsWithViewCount = posts.map((post) => ({
      ...post,
      viewCount: Array.isArray(post.views) ? post.views.length : 0,
    }));

    res.status(200).json({
      posts: postsWithViewCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPosts / limitNum),
        totalPosts,
        postsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPosts / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getLikedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const user = await User.findById(userId).populate("likedPosts");
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPosts = user.likedPosts.length;

    const posts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate(
        "author",
        "username name bio profilePic isVerified isPrivate followers"
      )
      .populate("likes.user", "username profilePic")
      .populate("reposts.user", "username profilePic")
      .populate({
        path: "quotedPost",
        populate: {
          path: "author",
          select: "username name bio profilePic isVerified isPrivate followers",
        },
      })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean();

    const postsWithViewCount = posts.map((post) => ({
      ...post,
      viewCount: Array.isArray(post.views) ? post.views.length : 0,
    }));

    res.status(200).json({
      posts: postsWithViewCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPosts / limitNum),
        totalPosts,
        postsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPosts / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
