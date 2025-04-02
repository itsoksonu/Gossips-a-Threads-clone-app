import { uploadToCloudinary } from "../config/cloudinary.js";
import FollowRequest from "../models/FollowRequest.js";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { io, connectedUsers } from '../server.js';

export const setupProfile = async (req, res) => {
  try {
    const { bio, link, isPrivate } = req.body;
    const bioLimit = 150;

    if (bio && bio.length > bioLimit) {
      return res
        .status(403)
        .json({ error: `Bio should be less than ${bioLimit} characters` });
    }

    if (link) {
      try {
        new URL(link);
      } catch (err) {
        return res.status(400).json({ error: "Invalid URL format" });
      }
    }

    const updateObj = {};
    if (bio !== undefined) updateObj.bio = bio;
    if (link !== undefined) updateObj.link = link;
    if (isPrivate !== undefined) updateObj.isPrivate = isPrivate === 'true' || isPrivate === true;

    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.path);
      updateObj.profilePic = cloudinaryResult.secure_url;
    }

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Handle switch from private to public
    const parsedIsPrivate = isPrivate === 'true' || isPrivate === true; // Handle string or boolean
    if (isPrivate !== undefined && !parsedIsPrivate) {
      const user = await User.findById(req.user);
      if (user.isPrivate) { // User was private before
        const pendingRequests = await FollowRequest.find({
          to: req.user,
          status: "pending",
        });

        if (pendingRequests.length > 0) {
          const followerIds = pendingRequests.map((req) => req.from);

          await User.findByIdAndUpdate(
            req.user,
            { $push: { followers: { $each: followerIds } } },
            { new: true }
          );

          await User.updateMany(
            { _id: { $in: followerIds } },
            { $push: { following: req.user } }
          );

          await FollowRequest.deleteMany({
            to: req.user,
            status: "pending",
          });

          // Emit WebSocket event to all affected users
          followerIds.forEach(followerId => {
            const socketId = connectedUsers.get(followerId.toString());
            if (socketId) {
              io.to(socketId).emit('followStatusUpdate', {
                username: user.username,
                action: 'follow',
                isPending: false,
                isPrivate: false,
                autoAccepted: true,
              });
            }
          });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user, updateObj, {
      runValidators: true,
      new: true,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      profilePic: updatedUser.profilePic,
    });
  } catch (error) {
    console.error("Profile setup error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select("-password -googleId -updatedAt")
      .populate("followers", "username name profilePic isVerified isPrivate followers following")
      .populate("following", "username name profilePic isVerified isPrivate followers following");

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get profile" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -token")
      .populate("followers", "username")
      .populate("following", "username")
      .sort({ isVerified: -1, createdAt: -1 });

    if (!users.length) {
      return res.status(404).json({ error: "No users found" });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const followUser = async (req, res) => {
  try {
    const userToFollow = await User.findOne({ username: req.params.username });
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToFollow._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    if (
      currentUser.following.some(
        (id) => id.toString() === userToFollow._id.toString()
      )
    ) {
      return res.status(400).json({ message: "You already follow this user" });
    }

    const existingRequest = await FollowRequest.findOne({
      from: req.user._id,
      to: userToFollow._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Follow request already sent" });
    }

    if (userToFollow.isPrivate) {
      const followRequest = new FollowRequest({
        from: req.user._id,
        to: userToFollow._id,
      });

      await followRequest.save();
      
      const socketId = connectedUsers.get(req.user._id.toString());
      if (socketId) {
        io.to(socketId).emit('followStatusUpdate', {
          username: userToFollow.username,
          action: 'follow',
          isPending: true,
          isPrivate: true
        });
      }

      return res.status(200).json({ message: "Follow request sent successfully" });
    }

    const notification = new Notification({
      user: userToFollow._id,
      sender: req.user._id,
      type: "follow",
      createdAt: new Date(),
      isRead: false,
    });
    await notification.save();

    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { following: userToFollow._id } },
      { new: true }
    );

    await User.findByIdAndUpdate(
      userToFollow._id,
      { $push: { followers: req.user._id } },
      { new: true }
    );

    const socketId = connectedUsers.get(req.user._id.toString());
    if (socketId) {
      io.to(socketId).emit('followStatusUpdate', {
        username: userToFollow.username,
        action: 'follow',
        isPending: false,
        isPrivate: false
      });
    }

    res.status(200).json({ message: "User followed successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Follow request already exists" });
    }
    console.error("Error following user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller to handle follow requests
export const getFollowRequests = async (req, res) => {
  try {
    const followRequests = await FollowRequest.find({
      to: req.user._id,
      status: "pending",
    }).populate("from", "username name profilePic");

    res.status(200).json(followRequests);
  } catch (error) {
    console.error("Error getting follow requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Accept a follow request
export const acceptFollowRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const followRequest = await FollowRequest.findById(requestId);

    if (!followRequest) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    if (followRequest.to.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to accept this request" });
    }

    if (followRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Request already ${followRequest.status}` });
    }

    // Update the follower and following arrays
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { followers: followRequest.from } },
      { new: true }
    );

    await User.findByIdAndUpdate(
      followRequest.from,
      { $push: { following: req.user._id } },
      { new: true }
    );

    // Delete the follow request instead of marking it as accepted
    await FollowRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Follow request accepted" });
  } catch (error) {
    console.error("Error accepting follow request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject a follow request
export const rejectFollowRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const followRequest = await FollowRequest.findById(requestId);

    if (!followRequest) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    if (followRequest.to.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject this request" });
    }

    if (followRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Request already ${followRequest.status}` });
    }

    // Delete the request instead of marking it as rejected
    await FollowRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Follow request rejected" });
  } catch (error) {
    console.error("Error rejecting follow request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel a follow request that you sent
export const cancelFollowRequest = async (req, res) => {
  try {
    const userToFollow = await User.findOne({ username: req.params.username });

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await FollowRequest.findOneAndDelete({
      from: req.user._id,
      to: userToFollow._id,
      status: "pending",
    });

    if (!result) {
      return res.status(404).json({ message: "No pending follow request found" });
    }

    const socketId = connectedUsers.get(req.user._id.toString());
    if (socketId) {
      io.to(socketId).emit('followStatusUpdate', {
        username: userToFollow.username,
        action: 'cancel-request',
        isPending: false
      });
    }

    res.status(200).json({ message: "Follow request canceled" });
  } catch (error) {
    console.error("Error canceling follow request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update the unfollow function to check if the user is private
export const unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findOne({ username: req.params.username });
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToUnfollow._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    if (
      !currentUser.following.some(
        (id) => id.toString() === userToUnfollow._id.toString()
      )
    ) {
      const pendingRequest = await FollowRequest.findOne({
        from: req.user._id,
        to: userToUnfollow._id,
        status: "pending",
      });

      if (pendingRequest) {
        await FollowRequest.deleteOne({ _id: pendingRequest._id });
        return res.status(200).json({ message: "Follow request canceled" });
      }

      return res.status(400).json({ message: "You are not following this user" });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { following: userToUnfollow._id } },
      { new: true }
    );

    await User.findByIdAndUpdate(
      userToUnfollow._id,
      { $pull: { followers: req.user._id } },
      { new: true }
    );

    const socketId = connectedUsers.get(req.user._id.toString());
    if (socketId) {
      io.to(socketId).emit('followStatusUpdate', {
        username: userToUnfollow.username,
        action: 'unfollow'
      });
    }

    res.status(200).json({ message: "User unfollowed successfully" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get whether current user has a pending follow request to a specific user
export const checkPendingRequestStatus = async (req, res) => {
  try {
    const userToCheck = await User.findOne({ username: req.params.username });
    
    if (!userToCheck) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const pendingRequest = await FollowRequest.findOne({
      from: req.user._id,
      to: userToCheck._id,
      status: "pending"
    });
    
    return res.status(200).json({ isPending: !!pendingRequest });
  } catch (error) {
    console.error("Error checking pending request status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const FollowingUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('following')
      .populate('following', '_id username name profilePic isPrivate');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user.following);
  } catch (error) {
    console.error('Error fetching following list:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { username } = req.params;
    const pageNumber = Number(req.query.page) || 1;
    const limitNumber = Number(req.query.limit) || 10;

    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const replies = await Comment.find({
      author: user._id,
    })
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("author", "username profilePic") // Populate the reply's author
      .populate({
        path: "parent",
        select: "content media createdAt",
        populate: {
          path: "author",
          select: "username profilePic",
        },
      }) // Populate the parent comment, its media, and its author
      .populate({
        path: "post",
        select: "content media createdAt",
        populate: {
          path: "author",
          select: "username profilePic",
        },
      }); // Populate the post, its media, and its author

    const totalReplies = await Comment.countDocuments({
      author: user._id,
    });

    return res.status(200).json({
      success: true,
      replies,
      pagination: {
        total: totalReplies,
        page: pageNumber,
        limit: limitNumber,
        hasNextPage: pageNumber * limitNumber < totalReplies,
      },
    });
  } catch (error) {
    console.error("Error fetching user replies:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user replies",
      error: error.message,
    });
  }
};

export const getReposts = async (req, res) => {
  try {
    const username = req.params.profileId;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const profileId = user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const repostedPosts = await Post.find({
      "reposts.user": profileId,
    })
      .populate({
        path: "author",
        select: "username name profilePic",
      })
      .populate({
        path: "likes.user",
        select: "username profilePic",
      })
      .populate({
        path: "reposts.user",
        select: "username profilePic",
      })
      .populate({
        path: "quotedPost",
        populate: [
          { path: "author", select: "username profilePic" },
          { path: "likes.user", select: "username profilePic" },
          { path: "reposts.user", select: "username profilePic" },
        ],
      })
      .lean();

    const formattedRepostedPosts = repostedPosts
      .map((post) => {
        const repost = post.reposts.find(
          (r) => r.user && r.user._id.toString() === profileId.toString()
        );
        if (!repost || !repost.repostedAt) {
          return null;
        }
        return {
          type: "post",
          content: post,
          repostTimestamp: new Date(repost.repostedAt),
        };
      })
      .filter((item) => item !== null);

    const repostedComments = await Comment.find({
      "reposts.user": profileId,
    })
      .populate({
        path: "author",
        select: "username name profilePic",
      })
      .populate({
        path: "likes.user",
        select: "username profilePic",
      })
      .populate({
        path: "reposts.user",
        select: "username profilePic",
      })
      .populate({
        path: "post",
        select: "_id",
      })
      .lean();

    const formattedRepostedComments = repostedComments
      .map((comment) => {
        const repost = comment.reposts.find(
          (r) => r.user && r.user._id.toString() === profileId.toString()
        );
        if (!repost || !repost.repostedAt) {
          return null;
        }
        return {
          type: "comment",
          content: comment,
          repostTimestamp: new Date(repost.repostedAt),
        };
      })
      .filter((item) => item !== null);

    const combinedReposts = [
      ...formattedRepostedPosts,
      ...formattedRepostedComments,
    ].sort((a, b) => {
      const timestampDiff = new Date(b.repostTimestamp) - new Date(a.repostTimestamp);
      if (timestampDiff !== 0) {
        return timestampDiff;
      }
      return a.content._id.toString().localeCompare(b.content._id.toString());
    });

    const paginatedReposts = combinedReposts.slice(skip, skip + limit);
    const hasNextPage = combinedReposts.length > skip + limit;

    res.status(200).json({
      reposts: paginatedReposts,
      pagination: {
        currentPage: page,
        hasNextPage,
        totalItems: combinedReposts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching reposts:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const isFollowingMe = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user._id; // From authenticated user

    // Find the user by username
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the current user and check if targetUser is in their followers
    const currentUser = await User.findById(currentUserId);
    const isFollowingMe = currentUser.followers.some(follower => 
      follower.toString() === targetUser._id.toString()
    );

    res.status(200).json({ isFollowingMe });
  } catch (error) {
    console.error('Error checking if user is following me:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};