import { useContext, useState, useEffect, useRef, useCallback } from "react";
import MobileNavbar from "../components/layouts/mobile-navbar";
import SiteHeader from "../components/layouts/site-header";
import CreatePost from "../components/CreatePost";
import { UserContext } from "../contexts/UserContext";
import PostCard from "../components/PostCard";
import axios from "axios";
import { Icons } from "../components/icons";
import StarOnGithubCard from "../components/StarOnGithubCard";

export default function PagesLayout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { userAuth, setUserAuth } = useContext(UserContext);
  const { token, id: currentUserId, profilePic } = userAuth || {};
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedType, setFeedType] = useState("all");
  const [isRefetching, setIsRefetching] = useState(false);
  const observer = useRef();
  const postIds = useRef(new Set());
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const shouldFetch = useRef(false);

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const refetchPosts = async () => {
    if (!token) return;
    setIsRefetching(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER}/posts/feed`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: 1,
            limit: 10,
            type: feedType === "following" ? "following" : undefined,
          },
        }
      );

      const filteredPosts = response.data.posts.filter((post) => {
        if (!post?.author?._id) return false;
        if (post.author._id === currentUserId) return true;
        if (!post.author.isPrivate) return true;
        return followingUsers.has(post.author._id);
      });

      postIds.current.clear();

      const newPosts = filteredPosts;
      newPosts.forEach((post) => postIds.current.add(post._id));

      setPosts(newPosts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ));
      
      setPage(2);
      setHasMore(response.data.pagination?.hasNextPage ?? false);
      shouldFetch.current = false;
    } catch (error) {
      console.error("Error refetching posts:", error);
    } finally {
      setIsRefetching(false);
    }
  };

  const layoutContext = { openCreateModal, closeCreateModal, refetchPosts };

  const switchFeedType = (type) => {
    if (type === feedType) return;
    
    setPosts([]);
    setPage(1);
    setHasMore(true);
    postIds.current.clear();
    setFeedType(type);
    shouldFetch.current = true;
  };

  useEffect(() => {
    if (!token) return;

    const fetchFollowingList = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/user/following`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const following = new Set(response.data.map((user) => user._id));
        setFollowingUsers(following);
      } catch (error) {
        console.error(
          "Error fetching following list:",
          error.response?.data || error.message
        );
        if (error.response?.status === 404) {
          setUserAuth({});
        }
      }
    };

    fetchFollowingList();
  }, [token, setUserAuth]);

  useEffect(() => {
    if (!token) return;
    
    shouldFetch.current = true;
    refetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, feedType]);

  useEffect(() => {
    if (!token || loading || !hasMore || isRefetching || !shouldFetch.current || page === 1) return;

    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/posts/feed`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page,
              limit: 10,
              type: feedType === "following" ? "following" : undefined,
            },
          }
        );

        const filteredPosts = response.data.posts.filter((post) => {
          if (!post?.author?._id) return false;
          if (post.author._id === currentUserId) return true;
          if (!post.author.isPrivate) return true;
          return followingUsers.has(post.author._id);
        });

        const newPosts = filteredPosts.filter(
          (post) => !postIds.current.has(post._id)
        );
        newPosts.forEach((post) => postIds.current.add(post._id));

        setPosts((prevPosts) => {
          const combinedPosts = [...prevPosts, ...newPosts];
          return combinedPosts.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        });
        setHasMore(response.data.pagination?.hasNextPage ?? false);
        shouldFetch.current = false;
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [
    token,
    page,
    feedType,
    followingUsers,
    currentUserId,
    hasMore,
    loading,
    isRefetching,
  ]);

  const handleNewPost = (newPost) => {
    if (!newPost?._id || postIds.current.has(newPost._id)) return;
    postIds.current.add(newPost._id);
    setPosts((prevPosts) => {
      const updatedPosts = [newPost, ...prevPosts];
      return updatedPosts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    });
    closeCreateModal();
  };

  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));
    postIds.current.delete(postId);
  };

  const lastPostRef = useCallback(
    (node) => {
      if (loading || isRefetching) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !shouldFetch.current) {
            shouldFetch.current = true;
            setPage((prevPage) => prevPage + 1);
          }
        },
        { threshold: 0.5 }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, isRefetching]
  );

  return (
    <div className="w-full bg-neutral-950">
      <SiteHeader layoutContext={layoutContext} />
      <main className="container max-w-[620px] px-4 sm:px-6 bg-neutral-950 mx-auto pb-16">
        {/* Feed Type Selector */}
        <div className="flex justify-center mt-2 mb-4">
          <div className="flex rounded-full bg-neutral-900 p-1">
            <button
              className={`px-4 py-1 rounded-full cursor-pointer ${feedType === "all" ? "bg-neutral-700" : ""}`}
              onClick={() => switchFeedType("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-1 rounded-full cursor-pointer ${feedType === "following" ? "bg-neutral-700" : ""}`}
              onClick={() => switchFeedType("following")}
            >
              Following
            </button>
          </div>
        </div>

        {token && (
          <div className="flex flex-row gap-4 mt-4">
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
              onClick={openCreateModal}
              readOnly
            />
            <button
              className="bg-white/10 w-22 h-10 rounded-full cursor-pointer"
              onClick={openCreateModal}
            >
              Post
            </button>
          </div>
        )}

        <hr className="border-0.1 border-neutral-700 -mt-2" />

        {isRefetching && (
          <div className="flex justify-center py-4">
            <Icons.spinner className="animate-spin h-7 w-7 text-neutral-400" />
          </div>
        )}

        {/* Render Posts */}
        <div className="mt-4 space-y-4">
          {posts.length > 0 ? (
            posts.map((post, index) => {
              const isLastPost = index === posts.length - 1;
              return (
                <div
                  key={post._id || index}
                  ref={isLastPost ? lastPostRef : null}
                  className="border-b border-neutral-800"
                >
                  <PostCard
                    item={post}
                    author={post.author}
                    onDelete={handleDeletePost}
                    onUpdate={(updatedPost) => {
                      setPosts((prevPosts) =>
                        prevPosts.map((p) =>
                          p._id === updatedPost._id ? updatedPost : p
                        )
                      );
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-neutral-400">
              {loading ? (
                <Icons.spinner className="animate-spin mx-auto" />
              ) : (
                ""
              )}
            </div>
          )}
        </div>

        {/* Loading  */}
        {loading && posts.length > 0 && !isRefetching && (
          <div className="flex justify-center py-4">
            <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
          </div>
        )}
      </main>

      <MobileNavbar layoutContext={layoutContext} />
      <CreatePost
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onPostCreated={handleNewPost}
      />
      <div className="left-34 bottom-18 fixed">
        <StarOnGithubCard />
      </div>

      <div className="hidden xl:flex fixed bottom-15 right-8">
        <button
          className="border border-neutral-700 bg-neutral-900 px-7 py-5 rounded-xl text-[14px] shadow-lg font-medium tracking-wide hover:scale-105 active:scale-95 cursor-pointer select-none transform transition-all duration-150 ease-out flex items-center justify-center"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Icons.plus />
        </button>
      </div>
    </div>
  );
}
