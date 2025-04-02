import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import CreatePost from "../components/CreatePost";
import SiteHeader from "../components/layouts/site-header";
import MobileNavbar from "../components/layouts/mobile-navbar";
import PostCard from "../components/PostCard";
import { UserContext } from "../contexts/UserContext";
import { Icons } from "../components/icons";
import ViewActivityModal from "../components/ViewActivityModal"; 

const PostPage = () => {
  const { Postid } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false); 
  const { userAuth } = useContext(UserContext);
  const observer = useRef();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const openActivityModal = () => setIsActivityModalOpen(true);
  const closeActivityModal = () => setIsActivityModalOpen(false);

  useEffect(() => {
    if (!userAuth?.token) return;

    const fetchPost = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/posts/post/${Postid}`,
          { headers: { Authorization: `Bearer ${userAuth.token}` } }
        );
        setPost(response.data);
      } catch (err) {
        console.error("Error fetching post:", err);
        setError(err.response?.data?.error || "Failed to fetch post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [Postid, userAuth]);

  useEffect(() => {
    if (!userAuth?.token || loading || !hasMore) return;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/reply/replies/${Postid}`,
          {
            headers: { Authorization: `Bearer ${userAuth.token}` },
            params: { page, limit: 10, parentOnly: true },
          }
        );
        const uniqueComments = Array.from(
          new Map([...(comments || []), ...response.data.comments].map(c => [c._id, c])).values()
        );
        setComments(uniqueComments);
        setHasMore(response.data.pagination?.hasNextPage ?? false);
      } catch (err) {
        console.error("Error fetching comments:", err);
        setError(err.response?.data?.error || "Failed to fetch comments");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [Postid, userAuth, page, hasMore, loading, comments]);

  const lastCommentRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
        },
        { threshold: 0.5 }
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  return (
    <div className="w-full bg-neutral-950">
      <SiteHeader layoutContext={{ openCreateModal, closeCreateModal }} />
      <main className="container max-w-[620px] px-4 sm:px-6 bg-neutral-950 mx-auto mt-2 pb-16">
        {loading ? (
          <p className="text-white text-center mb-4">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : post ? (
          <PostCard item={post} author={post.author} />
        ) : (
          <p className="text-gray-400 text-center">No post found.</p>
        )}

        <div className="flex flex-row items-center justify-between py-4 border-y border-neutral-800">
          <p className="font-medium pl-2">Replies</p>
          <button
            onClick={openActivityModal}
            className="flex flex-row items-center text-neutral-500 cursor-pointer font-medium"
          >
            View activity <Icons.chevronRight strokeColor="#737373" className="mt-0.5" />
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {comments && comments.length > 0 ? (
            comments.map((comment, index) => (
              <div
                key={comment._id}
                ref={index === comments.length - 1 ? lastCommentRef : null}
                className="border-b border-neutral-800"
              >
                <PostCard
                  item={comment}
                  author={comment.author}
                  isReply={false}
                  depth={0}
                  postId={Postid}
                  isComment={true}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-neutral-400">
              {loading ? <Icons.spinner className="animate-spin mx-auto" /> : "No Comments available yet."}
            </div>
          )}
        </div>

        {loading && comments?.length > 0 && (
          <div className="flex justify-center py-4">
            <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
          </div>
        )}
      </main>
      <CreatePost isOpen={isCreateModalOpen} onClose={closeCreateModal} />
      <MobileNavbar layoutContext={{ openCreateModal, closeCreateModal }} />
      <ViewActivityModal
        isOpen={isActivityModalOpen}
        onClose={closeActivityModal}
        post={post}
        token={userAuth?.token}
      />
    </div>
  );
};

export default PostPage;