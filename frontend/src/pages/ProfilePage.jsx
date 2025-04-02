import axios from "axios";
import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import InPageNavigation from "../components/InPageNavigation";
import MobileNavbar from "../components/layouts/mobile-navbar";
import SiteHeader from "../components/layouts/site-header";
import CreatePost from "../components/CreatePost";
import { Icons } from "../components/icons";
import FollowButton from "../components/FollowButton";
import PostCard from "../components/PostCard";
import ReplyThread from "../components/ReplyThread";
import FollowersModal from "../components/FollowersModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";

// eslint-disable-next-line react-refresh/only-export-components
export const profileDataStructure = {
  name: "",
  username: "",
  profilePic: "",
  bio: "",
  link: "",
  followers: [],
  following: [],
  isVerified: false,
  isPrivate: false,
};

const ProfilePage = () => {
  const { profileId } = useParams();
  const { userAuth, setUserAuth } = useContext(UserContext);
  const { token, username: currentUsername, profilePic } = userAuth || {};

  const [profile, setProfile] = useState(profileDataStructure);
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [profileLoaded, setProfileLoaded] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repostsLoading, setRepostsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repostsPage, setRepostsPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [hasMoreReposts, setHasMoreReposts] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [initialRepliesLoad, setInitialRepliesLoad] = useState(true);
  const [initialRepostsLoad, setInitialRepostsLoad] = useState(true);
  const [canViewPosts, setCanViewPosts] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const observer = useRef();
  const repliesObserver = useRef();
  const repostsObserver = useRef();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openFollowersModal = () => setIsFollowersModalOpen(true);
  const closeFollowersModal = () => setIsFollowersModalOpen(false);

  const layoutContext = {
    openCreateModal,
    closeCreateModal,
  };

  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const lastReplyRef = useCallback(
    (node) => {
      if (repliesLoading) return;
      if (repliesObserver.current) repliesObserver.current.disconnect();
      repliesObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreReplies) {
          setRepliesPage((prevPage) => prevPage + 1);
        }
      });
      if (node) repliesObserver.current.observe(node);
    },
    [repliesLoading, hasMoreReplies]
  );

  const lastRepostRef = useCallback(
    (node) => {
      if (repostsLoading) return;
      if (repostsObserver.current) repostsObserver.current.disconnect();
      repostsObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreReposts) {
          setRepostsPage((prevPage) => prevPage + 1);
        }
      });
      if (node) repostsObserver.current.observe(node);
    },
    [repostsLoading, hasMoreReposts]
  );

  const handleTabChange = (index) => {
    setActiveTab(index);
    if (index === 1 && replies.length === 0 && canViewPosts) {
      fetchUserReplies();
    }
    if (index === 2 && reposts.length === 0 && canViewPosts) {
      fetchUserReposts();
    }
  };

  const handleFollowStatusChange = async () => {
    setPosts([]);
    setReplies([]);
    setReposts([]);
    setPage(1);
    setRepliesPage(1);
    setRepostsPage(1);
    setHasMore(true);
    setHasMoreReplies(true);
    setHasMoreReposts(true);
    setInitialLoad(true);
    setInitialRepliesLoad(true);
    setInitialRepostsLoad(true);

    try {
      setProfileLoading(true);
      const [profileResponse, currentUserResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_SERVER}/user/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_SERVER}/user/${currentUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const updatedProfile = profileResponse.data || profileDataStructure;
      setProfile(updatedProfile);
      setProfileLoaded(profileId);

      const isOwnProfile = profileId === currentUsername;
      const isProfileNotPrivate = !updatedProfile.isPrivate;
      const isFollowing = updatedProfile.followers?.some(
        (follower) => follower.username === currentUsername
      );
      setCanViewPosts(isOwnProfile || isProfileNotPrivate || isFollowing);

      if (currentUserResponse.data) {
        setUserAuth((prev) => ({
          ...prev,
          following: currentUserResponse.data.following || [],
        }));
      }
    } catch (err) {
      console.error("Error updating follow status:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchUserProfile = useCallback(async () => {
    if (!token) return;
    try {
      setProfileLoading(true);
      const [profileResponse, currentUserResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_SERVER}/user/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_SERVER}/user/${currentUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const updatedProfile = profileResponse.data || profileDataStructure;
      setProfile(updatedProfile);
      setProfileLoaded(profileId);

      const isOwnProfile = profileId === currentUsername;
      const isProfileNotPrivate = !updatedProfile.isPrivate;
      const isFollowing = updatedProfile.followers?.some(
        (follower) => follower.username === currentUsername
      );
      setCanViewPosts(isOwnProfile || isProfileNotPrivate || isFollowing);

      if (currentUserResponse.data) {
        setUserAuth((prev) => ({
          ...prev,
          following: currentUserResponse.data.following || [],
        }));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [profileId, token, currentUsername, setUserAuth]);

  const fetchUserPosts = useCallback(async () => {
    if (!hasMore || !canViewPosts || !profile?.username || !token) return;

    setLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER}/posts/${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit: 10 },
        }
      );

      setPosts((prevPosts) => {
        const combinedPosts = initialLoad
          ? data.posts
          : [...prevPosts, ...data.posts];
        return Array.from(
          new Map(combinedPosts.map((post) => [post._id, post])).values()
        );
      });
      setHasMore(data.pagination?.hasNextPage ?? false);
      setInitialLoad(false);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [
    hasMore,
    canViewPosts,
    profile?.username,
    profileId,
    token,
    page,
    initialLoad,
  ]);

  const fetchUserReplies = useCallback(async () => {
    if (!hasMoreReplies || !canViewPosts || !profile?.username || !token)
      return;

    setRepliesLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER}/user/${profileId}/replies`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: repliesPage, limit: 10 },
        }
      );

      setReplies((prevReplies) => {
        const combinedReplies = initialRepliesLoad
          ? data.replies
          : [...prevReplies, ...data.replies];
        return Array.from(
          new Map(combinedReplies.map((reply) => [reply._id, reply])).values()
        );
      });
      setHasMoreReplies(data.pagination?.hasNextPage ?? false);
      setInitialRepliesLoad(false);
    } catch (err) {
      console.error("Error fetching replies:", err);
    } finally {
      setRepliesLoading(false);
    }
  }, [
    hasMoreReplies,
    canViewPosts,
    profile?.username,
    profileId,
    token,
    repliesPage,
    initialRepliesLoad,
  ]);

  const fetchUserReposts = useCallback(async () => {
    if (!hasMoreReposts || !canViewPosts || !profile?.username || !token)
      return;

    setRepostsLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER}/user/${profileId}/reposts`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: repostsPage, limit: 10 },
        }
      );

      setReposts((prevReposts) => {
        const combinedReposts = initialRepostsLoad
          ? data.reposts
          : [...prevReposts, ...data.reposts];
        return Array.from(
          new Map(
            combinedReposts.map((repost) => [repost.content._id, repost])
          ).values()
        );
      });
      setHasMoreReposts(data.pagination?.hasNextPage ?? false);
      setInitialRepostsLoad(false);
    } catch (err) {
      console.error(
        "Error fetching reposts:",
        err.response?.data || err.message
      );
    } finally {
      setRepostsLoading(false);
    }
  }, [
    hasMoreReposts,
    canViewPosts,
    profile?.username,
    profileId,
    token,
    repostsPage,
    initialRepostsLoad,
  ]);

  useEffect(() => {
    if (!token || profileId === profileLoaded) return;

    setProfile(profileDataStructure);
    setProfileLoaded("");
    setPosts([]);
    setReplies([]);
    setReposts([]);
    setPage(1);
    setRepliesPage(1);
    setRepostsPage(1);
    setHasMore(true);
    setHasMoreReplies(true);
    setHasMoreReposts(true);
    setInitialLoad(true);
    setInitialRepliesLoad(true);
    setInitialRepostsLoad(true);

    fetchUserProfile();
  }, [profileId, token, fetchUserProfile, profileLoaded]);

  useEffect(() => {
    if (profileLoaded && token && canViewPosts) {
      fetchUserPosts();
    }
  }, [profileLoaded, page, token, canViewPosts, fetchUserPosts]);

  useEffect(() => {
    if (profileLoaded && token && canViewPosts && activeTab === 1) {
      fetchUserReplies();
    }
  }, [
    profileLoaded,
    repliesPage,
    token,
    canViewPosts,
    activeTab,
    fetchUserReplies,
  ]);

  useEffect(() => {
    if (profileLoaded && token && canViewPosts && activeTab === 2) {
      fetchUserReposts();
    }
  }, [
    profileLoaded,
    repostsPage,
    token,
    canViewPosts,
    activeTab,
    fetchUserReposts,
  ]);

  const renderGossipsTab = () => (
    <div>
      {profileId === currentUsername && (
        <>
          <div className="flex flex-row gap-4">
            <img
              key={profilePic || "default"}
              src={profilePic || ""}
              alt="Profile"
              className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-500"
              referrerPolicy="no-referrer"
            />
            <textarea
              placeholder="Share a gossip..."
              className="w-full py-2 px-1 bg-transparent outline-none resize-none"
              onClick={() => setIsCreateModalOpen(true)}
              readOnly
            />
            <button
              className="bg-white/10 w-22 h-10 rounded-full cursor-pointer"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Post
            </button>
          </div>
          <hr className="border-0.1 border-neutral-700 -mt-2" />
        </>
      )}
      <div className="mt-4 space-y-4">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <div
              key={post._id || index}
              ref={index === posts.length - 1 ? lastPostRef : null}
              className="border-b border-neutral-800"
            >
              <PostCard
                item={post}
                author={post.author}
                onDelete={(postId) =>
                  setPosts((prev) => prev.filter((p) => p._id !== postId))
                }
                onUpdate={(updatedPost) =>
                  setPosts((prev) =>
                    prev.map((p) =>
                      p._id === updatedPost._id ? updatedPost : p
                    )
                  )
                }
              />
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-neutral-400">
            {loading && initialLoad ? (
              <Icons.spinner className="animate-spin mx-auto" />
            ) : (
              "No posts available yet."
            )}
          </div>
        )}
      </div>
      {loading && !initialLoad && (
        <div className="flex justify-center py-4">
          <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
        </div>
      )}
    </div>
  );

  const renderRepliesTab = () => (
    <div className="space-y-4">
      {replies.length > 0 ? (
        replies.map((reply, index) => (
          <ReplyThread
            key={reply._id || index}
            reply={reply}
            isLastReply={index === replies.length - 1}
            lastReplyRef={lastReplyRef}
          />
        ))
      ) : (
        <div className="text-center py-10 text-neutral-400">
          {repliesLoading && initialRepliesLoad ? (
            <Icons.spinner className="animate-spin mx-auto" />
          ) : (
            "No replies available yet."
          )}
        </div>
      )}
      {repliesLoading && !initialRepliesLoad && (
        <div className="flex justify-center py-4">
          <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
        </div>
      )}
    </div>
  );

  const renderRepostsTab = () => (
    <div className="mt-4 space-y-4">
      {reposts.length > 0 ? (
        reposts.map((repost, index) => (
          <div
            key={`${repost.type}-${repost.content._id || index}`}
            ref={index === reposts.length - 1 ? lastRepostRef : null}
            className="border-b border-neutral-800"
          >
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2 pl-7.5">
              <Icons.repost className="w-4 h-4" />
              <span>
                <Link
                  to={`/${profile.username}`}
                  className="text-neutral-400 hover:text-neutral-200 hover:underline"
                >
                  {profile.username}
                </Link>{" "}
                reposted
              </span>
            </div>
            <PostCard
              item={repost.content}
              author={repost.content.author}
              isComment={repost.type === "comment"}
              postId={
                repost.type === "comment" ? repost.content.post?._id : undefined
              }
              onDelete={(contentId) =>
                setReposts((prev) =>
                  prev.filter((r) => r.content._id !== contentId)
                )
              }
              onUpdate={(updatedContent) =>
                setReposts((prev) =>
                  prev.map((r) =>
                    r.content._id === updatedContent._id
                      ? { ...r, content: updatedContent }
                      : r
                  )
                )
              }
            />
          </div>
        ))
      ) : (
        <div className="text-center py-10 text-neutral-400">
          {repostsLoading && initialRepostsLoad ? (
            <Icons.spinner className="animate-spin mx-auto" />
          ) : (
            "No reposts available yet."
          )}
        </div>
      )}
      {repostsLoading && !initialRepostsLoad && (
        <div className="flex justify-center py-4">
          <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
        </div>
      )}
    </div>
  );

  const renderProfileSkeleton = () => (
    <div className="max-w-xl mx-auto px-4">
      <section className="flex items-center justify-center pt-4">
        <div className="w-full">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-center justify-center">
                <div className="h-6 w-32 bg-neutral-700 rounded animate-pulse" />
                <div className="ml-2 mt-2 flex gap-2">
                  <div className="h-4 w-4 bg-neutral-700 rounded-full animate-pulse" />
                  <div className="h-4 w-4 bg-neutral-700 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-24 bg-neutral-700 rounded mt-2 animate-pulse" />
            </div>
            <div className="ml-12">
              <div className="w-18 h-18 rounded-full border-2 border-neutral-600 bg-neutral-700 animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-3/4 bg-neutral-700 rounded mt-3 animate-pulse" />
          <div className="pt-4 flex gap-2">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-neutral-700 border-2 border-neutral-950 animate-pulse"
                />
              ))}
            </div>
            <div className="h-4 w-20 bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </section>
      <div className="flex justify-center items-center gap-4 mt-2">
        {profileId === currentUsername ? (
          <div className="h-8 w-full max-w-xl bg-neutral-700 rounded-lg mt-4 animate-pulse" />
        ) : (
          <div className="flex flex-row items-center justify-center gap-2 w-full">
            <div className="h-10 w-full max-w-xl bg-neutral-700 rounded-lg mt-4 animate-pulse" />
            <div className="h-10 w-full max-w-xl bg-neutral-700 rounded-lg mt-4 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );

  const isOwnProfile = profileId === currentUsername;
  const isFollowing = profile.followers?.some(
    (follower) => follower.username === currentUsername
  );
  const canViewPrivateContent = isOwnProfile || isFollowing;

  return !token ? (
    <Navigate to="/login" />
  ) : (
    <div className="w-full bg-neutral-950">
      <SiteHeader
        layoutContext={layoutContext}
        openCreateModal={() => setIsCreateModalOpen(true)}
        closeCreateModal={() => setIsCreateModalOpen(false)}
      />
      {profileLoading ? (
        renderProfileSkeleton()
      ) : (
        <>
          <div className="max-w-xl mx-auto px-4 pb-16">
            <section className="flex items-center justify-center pt-4">
              <div className="w-full">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-center">
                      <p className="text-xl md:text-2xl capitalize h-6 text-white font-bold text-nowrap">
                        {profile.name || ""}
                      </p>
                      {profile.isVerified && (
                        <span className="ml-2 mt-1.5 md:mt-3">
                          <Icons.verified2 />
                        </span>
                      )}
                      {profile.isPrivate && (
                        <span className="ml-2 mt-1.5 md:mt-3 text-neutral-400">
                          <Icons.lock className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <h1 className="text-white pt-2">
                      {profile.username || ""}
                    </h1>
                  </div>
                  <div className="ml-12">
                    {profile.profilePic ? (
                      <img
                        src={profile.profilePic}
                        alt="Profile"
                        className="w-18 h-18 rounded-full border-2 border-neutral-600"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-neutral-600 bg-gray-700 flex items-center justify-center text-white">
                        No Image
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-white pt-3 max-w-200">{profile.bio || ""}</p>
                <div className="pt-4 text-neutral-400 flex flex-row items-center relative w-full">
                  <div className="flex items-center space-x-1 md:space-x-2 min-w-0 flex-grow">
                    {profile.isPrivate && !canViewPrivateContent ? (
                      <span className="flex items-center text-neutral-400 text-nowrap shrink-0">
                        <span className="text-[15px] md:text-[16px]">
                          {profile.followers?.length || 0} followers
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={openFollowersModal}
                        className="flex items-center hover:text-neutral-200 hover:underline text-nowrap shrink-0"
                      >
                        {profile.followers?.length > 0 && (
                          <div className="flex -space-x-2 mr-2 shrink-0">
                            {profile.followers.slice(0, 3).map((follower) => (
                              <div key={follower.username}>
                                {follower.profilePic ? (
                                  <img
                                    src={follower.profilePic}
                                    alt={follower.name}
                                    className="w-5 h-5 rounded-full border-2 border-neutral-950"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-neutral-950 bg-gray-700 flex items-center justify-center text-white text-xs">
                                    {follower.name?.charAt(0) || "?"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="text-[15px] md:text-[16px]">
                          {profile.followers?.length || 0} followers
                        </span>
                      </button>
                    )}
                    {profile.link && (
                      <>
                        <span className="text-[15px] md:text-[16px]">•</span>
                        <a
                          href={
                            profile.link.startsWith("http")
                              ? profile.link
                              : `https://${profile.link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 text-[15px] md:text-[16px] hover:underline truncate max-w-[calc(100%-100px)] overflow-hidden text-ellipsis whitespace-nowrap"
                        >
                          {profile.link.replace(/^https?:\/\//, "")}
                        </a>
                      </>
                    )}
                  </div>

                  {profileId === currentUsername ? (
                    ""
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 outline-none rounded-full hover:bg-neutral-800 transform transition-all duration-150 ease-out cursor-pointer flex items-center shrink-0"
                        >
                          <Icons.more />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="shadow-xl bg-[#181818] z-[999] rounded-2xl w-[250px] p-0 border border-neutral-700"
                      >
                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "copy-link")}
                          className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mt-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Copy link</span>
                          <Icons.copy />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "about")}
                          className="flex justify-between items-center cursor-pointer p-3 mx-2 tracking-normal select-none font-semibold text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>About this profile</span>
                          <Icons.about />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "add-to-feed")}
                          className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Add to feed</span>
                          <Icons.chevronRight />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "mute")}
                          className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mt-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Mute</span>
                          <Icons.mute />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "restrict")}
                          className="flex justify-between items-center  p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Restrict</span>
                          <Icons.restrict />
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "block")}
                          className="flex justify-between items-center text-red-500 p-3 mx-2 tracking-normal select-none font-semibold mt-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span> Block</span>
                          <Icons.block />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "report")}
                          className="flex justify-between items-center text-red-500 p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Report</span>
                          <Icons.report />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </section>

            <div className="flex justify-center items-center gap-4 mt-2">
              {profileId === currentUsername ? (
                <div className="flex flex-row items-center justify-center gap-2 w-full">
                  <Link
                    to="/profile-setup"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 text-white text-bold py-2 cursor-pointer max-w-xl w-full text-center mt-4 hover:bg-neutral-800"
                  >
                    <span className="font-medium">Edit profile</span>
                  </Link>

                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 text-white text-bold py-2 cursor-pointer max-w-xl w-full text-center mt-4">
                    <p className="font-medium">Share profile</p>
                  </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="shadow-xl bg-[#181818] z-[999] rounded-2xl w-[250px] mt-1 p-0 border border-neutral-700"
                      >
                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "copy-link")}
                          className="flex justify-between items-center p-3  tracking-normal select-none font-semibold m-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Copy link</span>
                          <Icons.copy />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          // onClick={(e) => handleIconClick(e, "share-to")}
                          className="flex justify-between items-center cursor-pointer p-3  m-2 tracking-normal select-none font-semibold text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                        >
                          <span>Share to</span>
                          <Icons.shareTo />
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>

                  
                </div>
              ) : (
                <div className="flex flex-row items-center justify-center gap-2 w-full">
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white text-bold py-2 cursor-pointer max-w-xl w-full text-center mt-4 font-medium">
                    <FollowButton
                      username={profile.username}
                      currentUserFollowing={userAuth.following || []}
                      isPrivate={profile.isPrivate}
                      onFollowStatusChange={handleFollowStatusChange}
                    />
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900 text-white text-bold py-2 cursor-not-allowed max-w-xl w-full text-center mt-4">
                    <p className="font-medium">Message</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 ">
              <InPageNavigation
                routes={["Gossips", "Replies", "Reposts"]}
                defaultActiveIndex={activeTab}
                onTabChange={handleTabChange}
              >
                {!canViewPosts && profile.isPrivate ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      This profile is private
                    </h3>
                    <p className="text-neutral-400 max-w-xs">
                      Follow this profile to see their posts.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeTab === 0 && renderGossipsTab()}
                    {activeTab === 1 && renderRepliesTab()}
                    {activeTab === 2 && renderRepostsTab()}
                  </>
                )}
              </InPageNavigation>
            </div>
          </div>
        </>
      )}
      <CreatePost
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
      />
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={closeFollowersModal}
        followers={profile.followers || []}
        following={profile.following || []}
        username={profile.username || ""}
      />
      <MobileNavbar
        layoutContext={layoutContext}
        openCreateModal={() => setIsCreateModalOpen(true)}
        closeCreateModal={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;
