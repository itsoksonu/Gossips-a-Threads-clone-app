import React, { useContext, useState, useEffect } from "react";
import CreatePost from "../components/CreatePost";
import SiteHeader from "../components/layouts/site-header";
import MobileNavbar from "../components/layouts/mobile-navbar";
import { Icons } from "../components/icons";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import FollowButton from "../components/FollowButton";

const ActivityPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { userAuth } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const layoutContext = { openCreateModal, closeCreateModal };

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/notification/notifications`,
          {
            headers: { Authorization: `Bearer ${userAuth.token}` },
          }
        );
        setNotifications(response.data.notifications || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userAuth) {
      fetchNotifications();
    }
  }, [userAuth]);

  const handleFollowRequestButton = (e) => {
    e.preventDefault();
    navigate("/followrequests");
  };

  const handleProfileClick = (username) => {
    navigate(`/${username}`);
  };

  const handleNotificationClick = (notification) => {
    const { type, post, sender, quotedPost } = notification;
    const postPath = `/${sender.username}/post/${post}`;
  
    if (post && (type === "quote" && quotedPost || type === "repost" || type !== "follow")) {
      navigate(postPath);
    } else if (type === "follow") {
      handleProfileClick(sender.username);
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

  const getActivityText = (notification) => {
    switch (notification.type) {
      case "like":
        return notification.comment ? "liked your reply" : "liked your gossip";
      case "follow":
        return "followed you";
      case "reply":
        return notification.parent ? "replied to you" : "replied to your gossip";
      case "quote":
        return "quoted your gossip";
      case "repost":
        return "reposted your gossip";
      case "welcome":
        return notification.sender.username === "gossips" ? "" : "welcomed you";
      default:
        return "";
    }
  };

  return (
    <div className="w-full bg-neutral-950 mb-16">
      <SiteHeader layoutContext={layoutContext} />
      <main className="container max-w-[620px] px-4 sm:px-6 bg-neutral-950 mx-auto mt-2">
        {userAuth.isPrivate && (
          <button
            className="bg-neutral-900 rounded-xl w-full p-4 flex flex-row items-center justify-between font-medium mb-4"
            onClick={handleFollowRequestButton}
          >
            <span>Follow requests</span>
            <Icons.chevronRight />
          </button>
        )}

        <div className="flex flex-col">
          {loading ? (
            <div className="flex justify-center py-4">
              <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className="flex relative items-center justify-between py-4 px-3 border-b border-neutral-800 cursor-pointer hover:bg-neutral-900"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex space-x-3 w-full">
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProfileClick(notification.sender.username);
                    }}
                  >
                    <img
                      src={
                        notification.sender.profilePic || "/default-profile.png"
                      }
                      alt={notification.sender.username}
                      className="h-10 w-10 rounded-full border border-neutral-800"
                      referrerPolicy="no-referrer"
                    />
                    {notification.type === "like" && (
                      <Icons.activityheart className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-rose-500 rounded-full h-5 w-5" />
                    )}
                    {notification.type === "repost" && (
                      <Icons.activityrepost className="absolute -bottom-1 -right-1 border-2 border-neutral-950 bg-[#c329bf] rounded-full h-5 w-5" />
                    )}
                    {notification.type === "quote" && (
                      <Icons.activityquote className="absolute -bottom-1 -right-1 bg-[#fe7900] border-2 border-neutral-950 rounded-full h-5 w-5" />
                    )}
                    {notification.type === "follow" && (
                      <Icons.activityfollow className="absolute -bottom-1 -right-1 bg-[#6e3def] border-2 border-neutral-950 rounded-full h-5 w-5" />
                    )}
                    {notification.type === "reply" && (
                      <Icons.activityreply className="absolute -bottom-1 -right-1 bg-[#24c3ff] border-2 border-neutral-950 rounded-full h-5 w-5" />
                    )}
                    {notification.type === "welcome" && (
                      <Icons.activityheart className="absolute top-6 -right-1 bg-rose-600 border-2 border-neutral-950 rounded-full h-5 w-5" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex space-x-1 max-w-[calc(100%-120px)]">
                      <p
                        className="text-white font-medium hover:underline truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileClick(notification.sender.username);
                        }}
                      >
                        {notification.sender.username}
                      </p>
                      {notification.sender.isVerified && (
                        <span className="inline-flex items-center mt-0.5 flex-shrink-0">
                          <Icons.verified />
                        </span>
                      )}
                      <p className="text-neutral-500 text-sm ml-1 mt-0.5 flex-shrink-0">
                        {formatCreatedAt(notification.createdAt)}
                      </p>
                    </div>
                    <p className="text-neutral-400 text-sm truncate">
                      {getActivityText(notification)}
                    </p>
                    {notification.type === "welcome" && (
                      <p className="text-white mt-1">
                        Hey {userAuth.name}! Welcome to Gossips. I hope you like
                        this project. If so, please make sure to give it a star
                        on GitHub and share your views on Twitter. Thanks.
                      </p>
                    )}
                  </div>
                </div>
                {notification.type === "follow" && (
                  <div className="absolute right-2 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-26">
                    <FollowButton
                      username={notification.sender.username}
                      currentUserFollowing={userAuth?.following}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-neutral-400 text-center py-10">
              No notifications yet.
            </p>
          )}
        </div>
      </main>
      <CreatePost isOpen={isCreateModalOpen} onClose={closeCreateModal} />
      <MobileNavbar layoutContext={layoutContext} />
    </div>
  );
};

export default ActivityPage;