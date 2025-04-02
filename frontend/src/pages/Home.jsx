import { useContext, useState, useEffect, useRef, useCallback } from "react";
import MobileNavbar from "../components/layouts/mobile-navbar";
import SiteHeader from "../components/layouts/site-header";
import CreatePost from "../components/CreatePost";
import { UserContext } from "../contexts/UserContext";
import PostCard from "../components/PostCard";
import axios from "axios";
import { Icons } from "../components/icons";

export default function PagesLayout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { userAuth, setUserAuth } = useContext(UserContext);
  const { token, id: currentUserId, profilePic } = userAuth || {};
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedType, setFeedType] = useState("all");
  const observer = useRef();
  const postIds = useRef(new Set());
  const [followingUsers, setFollowingUsers] = useState(new Set());

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const layoutContext = { openCreateModal, closeCreateModal };

  const switchFeedType = (type) => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    postIds.current.clear();
    setFeedType(type);
  };

  useEffect(() => {
    if (!token) return;

    const fetchFollowingList = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_SERVER}/user/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const following = new Set(response.data.map(user => user._id));
        setFollowingUsers(following);
      } catch (error) {
        console.error("Error fetching following list:", error.response?.data || error.message);
        if (error.response?.status === 404) {
          setUserAuth({});
        }
      }
    };

    fetchFollowingList();
  }, [token, setUserAuth]);

  useEffect(() => {
    if (!token || loading || !hasMore) return;

    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_SERVER}/posts/feed`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page,
            limit: 10,
            type: feedType === "following" ? "following" : undefined,
          },
        });

        const filteredPosts = response.data.posts.filter(post => {
          if (!post?.author?._id) return false; // Skip invalid posts
          if (post.author._id === currentUserId) return true;
          if (!post.author.isPrivate) return true;
          return followingUsers.has(post.author._id);
        });

        const newPosts = filteredPosts.filter(post => !postIds.current.has(post._id));
        newPosts.forEach(post => postIds.current.add(post._id));

        setPosts(prevPosts => {
          const combinedPosts = [...prevPosts, ...newPosts];
          return combinedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
        setHasMore(response.data.pagination?.hasNextPage ?? false);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, feedType, followingUsers, currentUserId, hasMore]);

  const handleNewPost = (newPost) => {
    if (!newPost?._id || postIds.current.has(newPost._id)) return;
    postIds.current.add(newPost._id);
    setPosts(prevPosts => {
      const updatedPosts = [newPost, ...prevPosts];
      return updatedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    closeCreateModal();
  };

  const handleDeletePost = (postId) => {
    setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
    postIds.current.delete(postId);
  };

  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setPage(prevPage => prevPage + 1);
          }
        },
        { threshold: 0.5 }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
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

        {/* Render Posts with Infinite Scroll */}
        <div className="mt-4 space-y-4">
          {posts.length > 0 ? (
            posts.map((post, index) => {
              const isLastPost = index === posts.length - 1;
              return (
                <div
                  key={post._id || index} // Fallback to index if _id is missing
                  ref={isLastPost ? lastPostRef : null}
                  className="border-b border-neutral-800"
                >
                  <PostCard
                    item={post} // Changed from 'post' to 'item'
                    author={post.author}
                    onDelete={handleDeletePost}
                    onUpdate={(updatedPost) => {
                      setPosts(prevPosts =>
                        prevPosts.map(p => (p._id === updatedPost._id ? updatedPost : p))
                      );
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-neutral-400">
              {loading ? <Icons.spinner className="animate-spin mx-auto" /> : "No posts available yet."}
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && posts.length > 0 && (
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
    </div>
  );
}