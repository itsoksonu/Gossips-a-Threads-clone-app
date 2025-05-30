import React, { useState, useEffect, useRef } from "react";
import Modal from "react-modal";
import { Icons } from "./icons";
import axios from "axios";
import FollowButton from "./FollowButton";
import { useNavigate } from "react-router";
import { UserContext } from "../contexts/UserContext";
import { useContext } from "react";
import { useFollow } from "../contexts/FollowContext.jsx";

Modal.setAppElement("#root");

const UserListModal = ({ isOpen, onClose, title, fetchUrl, token, post }) => {
  const navigate = useNavigate();
  const { userAuth } = useContext(UserContext);
  const { followUpdates } = useFollow();
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  const scrollContainerRef = useRef(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      setUserList([]); 
      setPage(1);
      return;
    }
    document.body.style.overflow = "hidden";

    const fetchUsers = async (pageNum) => {
      setLoading(pageNum === 1);
      setIsFetchingMore(pageNum > 1);
      try {
        const response = await axios.get(`${fetchUrl}?page=${pageNum}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedUsers = response.data.users || [];
        const updatedUsers = fetchedUsers.map((user) => ({
          ...user,
          isFollowing: userAuth?.following?.some(
            (f) => (typeof f === "object" ? f.username : f) === user.username
          ),
        }));
        setUserList((prev) => (pageNum === 1 ? updatedUsers : [...prev, ...updatedUsers]));
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalCount(response.data.pagination?.totalItems || fetchedUsers.length);
      } catch (err) {
        console.error(`Error fetching ${title.toLowerCase()}:`, err);
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    };

    fetchUsers(page);

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, fetchUrl, token, page, userAuth?.following, followUpdates, title]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isNearBottom && !loading && !isFetchingMore && page < totalPages) {
        setPage((prev) => prev + 1);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [loading, isFetchingMore, page, totalPages]);

  const handleProfileClick = (username) => {
    navigate(`/${username}`);
    onClose();
  };

  const handleQuoteClick = (username, postId) => {
    navigate(`/${username}/post/${postId}`);
    onClose();
  };

  const getActionTimestamp = (user, activityType) => {
    switch (activityType.toLowerCase()) {
      case "likes":
        return user.likedAt || user.createdAt;
      case "reposts":
        return user.repostedAt || user.createdAt;
      case "quotes":
        return user.createdAt;
      default:
        return user.createdAt;
    }
  };

  const formatCreatedAt = (createdAt) => {
    const postDate = new Date(createdAt);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);
  
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 52) return `${diffInWeeks}w`;
    const diffInYears = Math.floor(diffInWeeks / 52);
    return `${diffInYears}y`;
  };
  

  if (!isOpen) return null;

  const activityType = title.toLowerCase();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-neutral-950 text-white border border-neutral-800 rounded-2xl max-w-lg w-full ml-4 mr-4 mx-auto pb-2 outline-none"
      overlayClassName="fixed inset-0 bg-black/80 flex items-center justify-center"
    >
      <div className="relative flex flex-col max-h-[70vh] h-full">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-neutral-800">
            <button onClick={onClose} className="text-neutral-400 hover:text-white">
              <Icons.back className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-white">{`${totalCount} ${title}`}</h2>
            <div className="w-6"></div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollContainerRef}>
            {/* Original Post Preview */}
            <div className="border mx-4 mt-4 border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center mb-2">
                <div
                  className="cursor-pointer"
                  onClick={() => handleProfileClick(post.author.username)}
                >
                  <img
                    src={post.author.profilePic || "/default-profile.png"}
                    alt={post.author.username}
                    className="h-6 w-6 rounded-full mr-2"
                  />
                </div>
                <div className="flex">
                  <p
                    className="text-white font-medium line-clamp-1 flex items-center hover:underline"
                    onClick={() => handleProfileClick(post.author.username)}
                  >
                    {post.author.username}
                  </p>
                  {post.author.isVerified && (
                    <span className="pl-1.5 pt-0.75 inline-flex items-center">
                      <Icons.verified />
                    </span>
                  )}
                  <p className="min-w-fit text-neutral-500 ml-2 flex items-center">
                    {formatCreatedAt(post.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-white line-clamp-1">{post.content}</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
              </div>
            ) : userList.length > 0 ? (
              userList.map((user) => (
                <div
                  key={user._id}
                  className={`flex relative items-center justify-between py-4 px-3 border-b border-neutral-800 ${
                    activityType === "quotes" && user.quotePostId ? "cursor-pointer hover:bg-neutral-900" : ""
                  }`}
                  onClick={activityType === "quotes" && user.quotePostId ? () => handleQuoteClick(user.username, user.quotePostId) : undefined}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(user.username);
                      }}
                    >
                      <img
                        src={user.profilePic || "/default-profile.png"}
                        alt={user.username}
                        className="h-10 w-10 rounded-full"
                      />
                      {activityType === "likes" && (
                        <Icons.activityheart className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-rose-500 rounded-full h-5 w-5" />
                      )}
                      {activityType === "reposts" && (
                        <Icons.activityrepost className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-[#c329bf] rounded-full h-5 w-5" />
                      )}
                      {activityType === "quotes" && (
                        <Icons.activityquote className="absolute -bottom-1 -right-1 bg-[#fe7900] border-2 border-neutral-950 rounded-full h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center space-x-1 max-w-[calc(100%-120px)]">
                        <p
                          className="text-white font-medium cursor-pointer hover:underline truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(user.username);
                          }}
                        >
                          {user.username}
                        </p>
                        {user.isVerified && (
                          <span className="inline-flex items-center mt-0.5 flex-shrink-0">
                            <Icons.verified />
                          </span>
                        )}
                        <p className="text-neutral-500 text-sm ml-1 mt-0.5 flex-shrink-0">
                          {formatCreatedAt(getActionTimestamp(user, title))}
                        </p>
                      </div>
                      <p className="text-neutral-400 text-sm truncate">{user.name}</p>
                      {activityType === "quotes" && user.content && (
                        <p className="text-white text-sm line-clamp-1 mt-1">{user.content}</p>
                      )}
                    </div>
                  </div>
                  {userAuth?.username !== user.username && (
                    <div
                      className="absolute right-3 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-24 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FollowButton
                        username={user.username}
                        currentUserFollowing={userAuth?.following || []}
                        isPrivate={user.isPrivate}
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-center py-10">
                No {title.toLowerCase()} yet.
              </p>
            )}
            {isFetchingMore && (
              <div className="flex justify-center py-4">
                <Icons.spinner className="animate-spin h-6 w-6 text-neutral-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Main ViewActivityModal Component
const ViewActivityModal = ({ isOpen, onClose, post, token }) => {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [repostsModalOpen, setRepostsModalOpen] = useState(false);
  const [quotesModalOpen, setQuotesModalOpen] = useState(false);
  const { userAuth } = useContext(UserContext);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }
    document.body.style.overflow = "hidden";

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/posts/activity/${post._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setActivity(response.data.activity || []);
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, post, token]);

  if (!isOpen) return null;

  const viewCount = post.viewCount || 0;
  const likeCount = post.likes?.length || 0;
  const repostCount = post.reposts?.length || 0;
  const quoteCount = activity.filter((item) => item.type === "quote").length;

  const handleProfileClick = (username) => {
    navigate(`/${username}`);
    onClose();
  };

  const handleQuoteClick = (username, postId) => {
    navigate(`/${username}/post/${postId}`);
    onClose();
  };

  const formatCreatedAt = (createdAt) => {
    const postDate = new Date(createdAt);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays <= 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-neutral-950 text-white border border-neutral-800 rounded-2xl max-w-lg w-full ml-4 mr-4 mx-auto pb-2 outline-none"
      overlayClassName="fixed inset-0 bg-black/80 flex items-center justify-center"
    >
      <div className="relative flex flex-col max-h-[70vh] h-full">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex justify-between items-center p-4 ">
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              <Icons.back />
            </button>
            <h2 className="font-medium text-white">Post Activity</h2>
            <p className="cursor-pointer">Sort</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Post Preview */}
            <div className="border mx-4 border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center mb-2">
                <div
                  className="cursor-pointer"
                  onClick={() => handleProfileClick(post.author.username)}
                >
                  <img
                    src={post.author.profilePic || "/default-profile.png"}
                    alt={post.author.username}
                    className="h-6 w-6 rounded-full mr-2"
                  />
                </div>
                <div className="flex">
                  <p
                    className="text-white font-medium line-clamp-1 flex items-center hover:underline"
                    onClick={() => handleProfileClick(post.author.username)}
                  >
                    {post.author.username}
                  </p>
                  {post.author.isVerified && (
                    <span className="pl-1.5 pt-0.75 inline-flex items-center">
                      <Icons.verified />
                    </span>
                  )}
                  <p className="min-w-fit text-neutral-500 ml-2 flex items-center">
                    {formatCreatedAt(post.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-white line-clamp-1">{post.content}</p>
            </div>

            {/* Stats Section */}
            <div className="flex-1 justify-between items-center p-4">
              <div className="flex items-center p-2 pb-4 border-b border-neutral-800 relative">
                <Icons.view className="h-6 w-6 text-neutral-400 mr-4" />
                <p className="font-medium">
                  Views{" "}
                  <span className="absolute right-10 text-end">{viewCount}</span>
                </p>
              </div>
              <div
                className="flex items-center p-2 py-4 border-b border-neutral-800 cursor-pointer relative"
                onClick={() => setLikesModalOpen(true)}
              >
                <Icons.like className="h-6 w-6 mr-4" />
                <p className="font-medium">
                  Likes{" "}
                  <span className="absolute right-10 text-end">{likeCount}</span>
                </p>
                {likeCount > 0 && (
                  <Icons.chevronRight className="h-6 w-6 absolute right-0 ml-1" />
                )}
              </div>
              <div
                className="flex items-center p-2 py-4 border-b border-neutral-800 cursor-pointer relative"
                onClick={() => setRepostsModalOpen(true)}
              >
                <Icons.repost className="h-6 w-6 mr-4" />
                <p className="font-medium">
                  Reposts{" "}
                  <span className="absolute right-10 text-end">{repostCount}</span>
                </p>
                {repostCount > 0 && (
                  <Icons.chevronRight className="h-6 w-6 absolute right-0 ml-1" />
                )}
              </div>
              <div
                className="flex items-center p-2 py-4 border-b border-neutral-800 cursor-pointer relative"
                onClick={() => setQuotesModalOpen(true)}
              >
                <Icons.quote className="h-6 w-6 mr-4" />
                <p className="font-medium">
                  Quotes{" "}
                  <span className="absolute right-10 text-end">{quoteCount}</span>
                </p>
                {quoteCount > 0 && (
                  <Icons.chevronRight className="h-6 w-6 absolute right-0 ml-1" />
                )}
              </div>
            </div>

            {/* Activity Feed */}
            {loading ? (
              <div className="flex justify-center">
                <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
              </div>
            ) : activity.length > 0 ? (
              activity.map((item, index) => (
                <div
                  key={index}
                  className={`flex relative items-center justify-between py-4 px-3 border-b border-neutral-800 ${
                    item.type === "quote" && item.quotePostId ? "cursor-pointer hover:bg-neutral-900" : ""
                  }`}
                  onClick={item.type === "quote" && item.quotePostId ? () => handleQuoteClick(item.user.username, item.quotePostId) : undefined}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(item.user.username);
                      }}
                    >
                      <img
                        src={item.user.profilePic || "/default-profile.png"}
                        alt={item.user.username}
                        className="h-10 w-10 rounded-full"
                      />
                      {item.type === "like" && (
                        <Icons.activityheart className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-rose-500 rounded-full h-5 w-5" />
                      )}
                      {item.type === "repost" && (
                        <Icons.activityrepost className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-[#c329bf] rounded-full h-5 w-5" />
                      )}
                      {item.type === "quote" && (
                        <Icons.activityquote className="absolute -bottom-1 -right-1 bg-[#fe7900] border-2 border-neutral-950 rounded-full h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center space-x-1 max-w-[calc(100%-120px)]">
                        <p
                          className="text-white font-medium cursor-pointer hover:underline truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(item.user.username);
                          }}
                        >
                          {item.user.username}
                        </p>
                        {item.user.isVerified && (
                          <span className="inline-flex items-center mt-0.5 flex-shrink-0">
                            <Icons.verified />
                          </span>
                        )}
                        <p className="text-neutral-500 text-sm ml-1 mt-0.5 flex-shrink-0">
                          {formatCreatedAt(item.timestamp)}
                        </p>
                      </div>
                      <p className="text-neutral-400 text-sm truncate">{item.user.name}</p>
                      {item.type === "quote" && item.content && (
                        <p className="text-white text-sm line-clamp-1 mt-1">{item.content}</p>
                      )}
                    </div>
                  </div>
                  {item.user.username !== userAuth?.username && (
                    <div
                      className="absolute right-3 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-24 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FollowButton
                        username={item.user.username}
                        currentUserFollowing={userAuth?.following || []}
                        isPrivate={item.user.isPrivate}
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-center py-10">No activity yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modals */}
      <UserListModal
        isOpen={likesModalOpen}
        onClose={() => setLikesModalOpen(false)}
        title="Likes"
        fetchUrl={`${import.meta.env.VITE_SERVER}/posts/likes/${post._id}`}
        token={token}
        post={post}
      />
      <UserListModal
        isOpen={repostsModalOpen}
        onClose={() => setRepostsModalOpen(false)}
        title="Reposts"
        fetchUrl={`${import.meta.env.VITE_SERVER}/posts/reposts/${post._id}`}
        token={token}
        post={post}
      />
      <UserListModal
        isOpen={quotesModalOpen}
        onClose={() => setQuotesModalOpen(false)}
        title="Quotes"
        fetchUrl={`${import.meta.env.VITE_SERVER}/posts/quotes/${post._id}`}
        token={token}
        post={post}
      />
    </Modal>
  );
};

export default ViewActivityModal;
