import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostMedia from "./PostMedia";
import PostActions from "./PostActions";
import MediaModal from "./MediaModal";
import Reply from "./Reply";
import CreatePost from "./CreatePost";
import Modal from "react-modal";
import toast from "react-hot-toast";
import { Icons } from "./icons";
import NoDataMessage from "./NoDataMessage";
import ProfileCard from "./ProfileCard";

Modal.setAppElement("#root");

const PostCard = ({
  item,
  author,
  isReply = false,
  depth = 0,
  parentAuthor = null,
  disableNestedReplies = false,
  postId: propPostId,
  onDelete,
  onUpdate,
  isComment = false,
  hideActionsHeader = false,
  hideActions = false,
  isDraft = false,
  onCancel,
  maxQuoteDepth = 1,
  removeOnUnsave = false,
}) => {
  const [data, setData] = useState(item || {});
  const {
    createdAt = "",
    content = "",
    media = [],
    likes = [],
    reposts = [],
    _id: id = "",
    replies = [],
    replyCount = 0,
    isRepost = false,
    reposterUsername = "",
    quotedPost = null,
    quotedComment = null,
    isQuoteRepost = false,
    isQuoteComment = false,
  } = data || {};

  const [selectedImage, setSelectedImage] = useState(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nestedReplies, setNestedReplies] = useState(replies || []);
  const [isRepliesLoaded, setIsRepliesLoaded] = useState(!!replies?.length);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const videoRefs = useRef({});
  const [isMuted, setIsMuted] = useState({});
  const [previousStates, setPreviousStates] = useState({});

  const navigate = useNavigate();
  const { userAuth, setUserAuth } = useContext(UserContext);

  const [likeCount, setLikeCount] = useState(likes?.length || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [repostCount, setRepostCount] = useState(reposts?.length || 0);
  const [isReposted, setIsReposted] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reposterInfo, setReposterInfo] = useState(null);

  // Check if the current user follows the author
  const isFollowing = userAuth?.following?.some(
    (user) =>
      (typeof user === "object" && user?.username === author?.username) ||
      user === author?.username
  );

  const mediaArray = React.useMemo(
    () => (!media ? [] : Array.isArray(media) ? media : [media]),
    [media]
  );

  useEffect(() => {
    if (item && userAuth) {
      setData(item);
      setLikeCount(item.likes?.length || 0);
      setIsLiked(
        (userAuth &&
          item.likes?.some(
            (like) =>
              like.user?._id === userAuth.id || like.user === userAuth.id
          )) ||
          false
      );
      setRepostCount(item.reposts?.length || 0);
      setIsReposted(
        (userAuth &&
          item.reposts?.some(
            (r) => r.user?._id === userAuth.id || r.user === userAuth.id
          )) ||
          false
      );
      setIsSaved(
        userAuth.savedPosts?.some((savedId) => savedId.toString() === id) ||
          false
      );
    }
  }, [item, userAuth, id]);

  useEffect(() => {
    if (isRepost && reposterUsername) {
      setReposterInfo({ username: reposterUsername });
    } else {
      setReposterInfo(null);
    }
  }, [isRepost, reposterUsername]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const mediaUrl = Object.keys(videoRefs.current).find(
            (key) => videoRefs.current[key] === video
          );
          if (entry.isIntersecting) {
            video.play().catch((err) => console.warn("Autoplay failed:", err));
            video.muted = isMuted[mediaUrl] ?? true;
          } else {
            video.pause();
            video.muted = true;
            setIsMuted((prev) => ({ ...prev, [mediaUrl]: true }));
          }
        });
      },
      { threshold: 0.5 }
    );

    const currentVideoRefs = videoRefs.current;
    Object.values(currentVideoRefs).forEach(
      (video) => video && observer.observe(video)
    );
    return () =>
      Object.values(currentVideoRefs).forEach(
        (video) => video && observer.unobserve(video)
      );
  }, [mediaArray, isMuted]);

  const isQuotedContentVisible = () => {
    if (quotedPost) {
      if (
        !quotedPost ||
        typeof quotedPost === "string" ||
        !quotedPost._id ||
        !quotedPost.author
      ) {
        return false;
      }
      if (!quotedPost.author.isPrivate) {
        return true;
      }
      if (!userAuth || !userAuth.id) {
        return false;
      }
      const isAuthor = quotedPost.author._id.toString() === userAuth.id;
      const isFollowing = quotedPost.author.followers?.some(
        (follower) =>
          follower._id?.toString() === userAuth.id ||
          follower.toString() === userAuth.id
      );
      return isAuthor || isFollowing;
    } else if (quotedComment) {
      if (
        !quotedComment ||
        typeof quotedComment === "string" ||
        !quotedComment._id ||
        !quotedComment.author
      ) {
        return false;
      }
      if (!quotedComment.author.isPrivate) {
        return true;
      }
      if (!userAuth || !userAuth.id) {
        return false;
      }
      const isAuthor = quotedComment.author._id.toString() === userAuth.id;
      const isFollowing = quotedComment.author.followers?.some(
        (follower) =>
          follower._id?.toString() === userAuth.id ||
          follower.toString() === userAuth.id
      );
      return isAuthor || isFollowing;
    }
    return true;
  };

  const loadReplies = useCallback(async () => {
    if (
      disableNestedReplies ||
      isRepliesLoaded ||
      isLoadingReplies ||
      !replyCount
    )
      return;

    setIsLoadingReplies(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER}/reply/comments/replies/${id}`,
        { headers: { Authorization: `Bearer ${userAuth?.token}` } }
      );
      setNestedReplies(response.data.comments || []);
      setIsRepliesLoaded(true);
      setShowReplies(true);
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [
    id,
    userAuth?.token,
    disableNestedReplies,
    isRepliesLoaded,
    isLoadingReplies,
    replyCount,
  ]);

  const toggleReplies = (e) => {
    e.stopPropagation();
    if (disableNestedReplies) return;
    !isRepliesLoaded ? loadReplies() : setShowReplies(!showReplies);
  };

  const toggleMute = (e, mediaUrl) => {
    e.stopPropagation();
    setIsMuted((prev) => ({ ...prev, [mediaUrl]: !prev[mediaUrl] }));
    if (videoRefs.current[mediaUrl])
      videoRefs.current[mediaUrl].muted = !isMuted[mediaUrl];
  };

  const openModal = (e, imageSrc) => {
    e.stopPropagation();
    const states = {};
    Object.keys(videoRefs.current).forEach((mediaUrl) => {
      const video = videoRefs.current[mediaUrl];
      if (video) {
        states[mediaUrl] = { wasPlaying: !video.paused, wasMuted: video.muted };
        video.pause();
        video.muted = true;
      }
    });
    setPreviousStates(states);
    setIsMuted((prev) => ({
      ...prev,
      ...Object.keys(videoRefs.current).reduce(
        (acc, url) => ({ ...acc, [url]: true }),
        {}
      ),
    }));
    setSelectedImage(imageSrc);
  };

  const closeModal = (e) => {
    if (e) e.stopPropagation();
    Object.keys(videoRefs.current).forEach((mediaUrl) => {
      const video = videoRefs.current[mediaUrl];
      if (video && previousStates[mediaUrl]) {
        video.muted = previousStates[mediaUrl].wasMuted;
        if (previousStates[mediaUrl].wasPlaying)
          video.play().catch((err) => console.warn("Autoplay failed:", err));
      }
    });
    setIsMuted((prev) => ({
      ...prev,
      ...Object.keys(previousStates).reduce(
        (acc, url) => ({ ...acc, [url]: previousStates[url].wasMuted }),
        {}
      ),
    }));
    setSelectedImage(null);
    setPreviousStates({});
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (author?.username) {
      setIsProfileModalOpen(true);
    }
  };

  const handleReposterClick = (e) => {
    e.stopPropagation();
    if (reposterUsername) {
      setIsProfileModalOpen(true);
      setReposterInfo({ username: reposterUsername });
    }
  };

  const handleQuotedContentClick = (e) => {
    e.stopPropagation();
    if (quotedPost?.author?.username && quotedPost?._id) {
      navigate(`/${quotedPost.author.username}/post/${quotedPost._id}`);
    } else if (quotedComment?.author?.username && quotedComment?._id) {
      const postId = quotedComment.post ? quotedComment.post.toString() : null;
      if (postId) {
        navigate(`/${quotedComment.author.username}/post/${postId}`);
      } else {
        console.warn("Quoted comment post ID is undefined:", quotedComment);
        toast.error("Cannot navigate: Comment post ID is missing.");
      }
    }
  };

  const handleCardClick = () => {
    if (author?.username && id) {
      if (isDraft) {
        setData((prev) => ({ ...prev, content: data.content || "" }));
        if (onUpdate) onUpdate(data);
      } else {
        navigate(`/${author.username}/post/${isComment ? propPostId : id}`);
      }
    }
  };

  const handleAction = async (e, action, endpoint, successMsg) => {
    e.stopPropagation();
    if (isLiking || isReposting || !userAuth?.id || !id) return;

    const setLoading = action === "like" ? setIsLiking : setIsReposting;
    const setCount = action === "like" ? setLikeCount : setRepostCount;
    const setState = action === "like" ? setIsLiked : setIsReposted;
    const currentState = action === "like" ? isLiked : isReposted;

    const newState = !currentState;
    try {
      setLoading(true);
      setState(newState);
      setCount((prev) => (newState ? prev + 1 : prev - 1));

      const { data } = await axios.post(
        `${import.meta.env.VITE_SERVER}${endpoint}/${id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${userAuth.token}` } }
      );

      const isCommentAction = endpoint === "/reply";
      const updatedData = isCommentAction ? data.comment : data.post;

      if (!updatedData) {
        throw new Error("No updated data returned from server");
      }

      updatedData.likes = Array.isArray(updatedData.likes)
        ? updatedData.likes
        : [];
      updatedData.reposts = Array.isArray(updatedData.reposts)
        ? updatedData.reposts
        : [];

      setData(updatedData);

      if (action === "like") {
        const updatedLikes = updatedData.likes;
        setIsLiked(
          updatedLikes.some(
            (like) =>
              like.user?._id === userAuth?.id || like.user === userAuth?.id
          )
        );
        setLikeCount(updatedLikes.length);
      } else if (action === "repost") {
        const updatedReposts = updatedData.reposts;
        setIsReposted(
          updatedReposts.some(
            (r) => r.user?._id === userAuth?.id || r.user === userAuth?.id
          )
        );
        setRepostCount(updatedReposts.length);
        toast.success(newState ? successMsg : "Repost removed");
      }
    } catch (error) {
      console.error(`Error ${action}ing:`, error);
      setState(currentState);
      setCount((prev) => (newState ? prev - 1 : prev + 1));
      toast.error(`Failed to ${action}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !userAuth?.token) {
      return;
    }
    setIsDeleting(true);
    try {
      const endpoint = isDraft
        ? "/posts/draft"
        : isComment
          ? "/reply"
          : "/posts";
      const response = await axios.delete(
        `${import.meta.env.VITE_SERVER}${endpoint}/${id}`,
        {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );
      if (response.status === 200) {
        if (onDelete) onDelete(id);
        toast.success("Deleted");
      }
    } catch (error) {
      console.error(
        "handleDelete - Error deleting:",
        error.response ? error.response.data : error.message
      );
      toast.error(
        `Failed to delete: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!id || !userAuth?.token || isSaving) return;

    const previousSaveState = isSaved;
    const newSaveState = !isSaved;

    setIsSaving(true);
    setIsSaved(newSaveState);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER}/posts/save/${id}`,
        {},
        { headers: { Authorization: `Bearer ${userAuth.token}` } }
      );

      setUserAuth((prev) => ({
        ...prev,
        savedPosts: response.data.savedPosts,
      }));

      if (!newSaveState && removeOnUnsave && onDelete) {
        onDelete(id);
      }

      toast.success(
        newSaveState ? "Post saved successfully" : "Post unsaved successfully"
      );
    } catch (error) {
      console.error("Error toggling save:", error);
      setIsSaved(previousSaveState);
      toast.error("Failed to save/unsave post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconClick = (e, action) => {
    e.stopPropagation();
    switch (action) {
      case "like":
        handleAction(e, "like", isComment ? "/reply" : "/posts", "Liked");
        break;
      case "reply":
        setIsReplyOpen(true);
        break;
      case "repost":
      case "unrepost":
        handleAction(e, "repost", isComment ? "/reply" : "/posts", "Reposted");
        break;
      case "quote":
        setIsQuoteOpen(true);
        break;
      case "delete":
      case "delete-draft":
        setIsDeleteModalOpen(true);
        break;
      case "save":
        handleSave(e);
        break;
      case "copy-link":
        if (id)
          navigator.clipboard.writeText(
            `https://yourdomain.com/${isComment ? "comment" : "post"}/${id}`
          );
        break;
      default:
        console.warn("Unhandled action:", action);
        break;
    }
  };

  if (!author || !id) {
    return null;
  }

  return (
    <>
      <div className="relative cursor-pointer" onClick={handleCardClick}>
        {reposterInfo && (
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2 ml-6">
            <Icons.repost className="w-4 h-4" />
            <span
              onClick={handleReposterClick}
              className="cursor-pointer hover:underline font-medium"
            >
              {reposterInfo.username}
            </span>{" "}
            <span>reposted</span>
          </div>
        )}
        <div className={`text-white w-full pb-2 ${isReply ? "pt-2" : ""}`}>
          {hideActionsHeader ? (
            <div
              className={`flex flex-col ${
                depth > 0 ? "ml-10 border-neutral-700" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  onClick={handleProfileClick}
                  className="cursor-pointer relative"
                >
                  <img
                    className={`rounded-full bg-neutral-800 object-cover border border-neutral-800 hover:opacity-80 transition ${
                      hideActionsHeader ? "w-6 h-6" : "w-10 h-10"
                    }`}
                    src={author.profilePic || ""}
                    alt="Profile"
                  />
                  
                </div>
                <PostHeader
                  author={author}
                  createdAt={createdAt}
                  handleIconClick={handleIconClick}
                  handleProfileClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${author.username}`);
                  }}
                  hideActions={hideActionsHeader}
                  isSaved={isSaved}
                  isSaving={isSaving}
                  isDraft={isDraft}
                  postId={id}
                  currentUserFollowing={userAuth?.following}
                  isPrivate={author.isPrivate}
                />
              </div>
              <div className="mt-1">
                <PostContent content={content} />
                <PostMedia
                  mediaArray={mediaArray}
                  videoRefs={videoRefs}
                  isMuted={isMuted}
                  toggleMute={toggleMute}
                  openModal={openModal}
                  hideActions={hideActionsHeader}
                />
              </div>
              {(isQuoteRepost || isQuoteComment) &&
                (quotedPost || quotedComment) &&
                maxQuoteDepth > 0 && (
                  <div className="my-2 py-3 px-3 md:px-5 border border-neutral-700 text-neutral-500 rounded-lg">
                    {isQuotedContentVisible() ? (
                      <div
                        onClick={handleQuotedContentClick}
                        className="cursor-pointer"
                      >
                        {quotedPost && (
                          <PostCard
                            item={quotedPost}
                            author={quotedPost.author}
                            hideActionsHeader={true}
                            hideActions={true}
                            maxQuoteDepth={maxQuoteDepth - 1}
                            removeOnUnsave={removeOnUnsave}
                          />
                        )}
                        {quotedComment && (
                          <PostCard
                            item={quotedComment}
                            author={quotedComment.author}
                            hideActionsHeader={true}
                            hideActions={true}
                            maxQuoteDepth={maxQuoteDepth - 1}
                            removeOnUnsave={removeOnUnsave}
                            isComment={true}
                            postId={quotedComment.post}
                          />
                        )}
                      </div>
                    ) : (
                      <div>
                        <NoDataMessage message="This quoted content is unavailable" />
                      </div>
                    )}
                  </div>
                )}
              {!hideActions && (
                <PostActions
                  handleIconClick={handleIconClick}
                  isLiked={isLiked}
                  isLiking={isLiking}
                  likeCount={likeCount}
                  replyCount={
                    replyCount || (Array.isArray(replies) ? replies.length : 0)
                  }
                  repostCount={repostCount}
                  isReposted={isReposted}
                  isReposting={isReposting}
                />
              )}
              {isComment && !disableNestedReplies && replyCount > 0 && (
                <button
                  onClick={toggleReplies}
                  className="text-blue-500 text-sm mt-2 hover:underline flex items-center"
                >
                  {isLoadingReplies
                    ? "Loading replies..."
                    : showReplies
                      ? "Hide replies"
                      : `Show ${replyCount} replies`}
                </button>
              )}
            </div>
          ) : (
            <div
              className={`flex gap-2 ${
                depth > 0 ? "ml-10 border-neutral-700" : ""
              }`}
            >
              <div
                onClick={handleProfileClick}
                className="cursor-pointer relative"
              >
                <img
                  className={`rounded-full bg-neutral-800 object-cover border border-neutral-800 hover:opacity-80 transition ${
                    hideActionsHeader ? "w-6 h-6" : "w-10 h-10"
                  }`}
                  src={author.profilePic || ""}
                  alt="Profile"
                />
                {!isFollowing && userAuth?.username !== author?.username && (
                  <span className="absolute top-6 right-0 bg-white rounded-full border-2 w-5 h-5 flex items-center justify-center text-black">
                    <Icons.profileplus />
                  </span>
                )}
              </div>
              <div className="flex-1">
                <PostHeader
                  author={author}
                  createdAt={createdAt}
                  handleIconClick={handleIconClick}
                  handleProfileClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${author.username}`);
                  }}
                  hideActions={hideActionsHeader}
                  isSaved={isSaved}
                  isSaving={isSaving}
                  isDraft={isDraft}
                  postId={id}
                  currentUserFollowing={userAuth?.following}
                  isPrivate={author.isPrivate}
                />
                {depth > 0 && parentAuthor && (
                  <div className="text-sm text-neutral-500 mb-1">
                    Replying to{" "}
                    <span className="text-blue-500">
                      @{parentAuthor.username}
                    </span>
                  </div>
                )}
                <PostContent content={content} />
                <PostMedia
                  mediaArray={mediaArray}
                  videoRefs={videoRefs}
                  isMuted={isMuted}
                  toggleMute={toggleMute}
                  openModal={openModal}
                  hideActions={hideActionsHeader}
                />
                {(isQuoteRepost || isQuoteComment) &&
                  (quotedPost || quotedComment) &&
                  maxQuoteDepth > 0 && (
                    <div className="my-2 pt-3 px-3 md:px-5 border border-neutral-700 rounded-lg">
                      {isQuotedContentVisible() ? (
                        <div
                          onClick={handleQuotedContentClick}
                          className="cursor-pointer"
                        >
                          {quotedPost && (
                            <PostCard
                              item={quotedPost}
                              author={quotedPost.author}
                              hideActionsHeader={true}
                              hideActions={true}
                              maxQuoteDepth={maxQuoteDepth - 1}
                              removeOnUnsave={removeOnUnsave}
                            />
                          )}
                          {quotedComment && (
                            <PostCard
                              item={quotedComment}
                              author={quotedComment.author}
                              hideActionsHeader={true}
                              hideActions={true}
                              maxQuoteDepth={maxQuoteDepth - 1}
                              removeOnUnsave={removeOnUnsave}
                              isComment={true}
                              postId={quotedComment.post}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-neutral-500 p-4 pb-6">
                          <NoDataMessage message="This quoted content is unavailable" />
                        </div>
                      )}
                    </div>
                  )}
                {!hideActions && (
                  <PostActions
                    handleIconClick={handleIconClick}
                    isLiked={isLiked}
                    isLiking={isLiking}
                    likeCount={likeCount}
                    replyCount={
                      replyCount ||
                      (Array.isArray(replies) ? replies.length : 0)
                    }
                    repostCount={repostCount}
                    isReposted={isReposted}
                    isReposting={isReposting}
                  />
                )}
                {isComment && !disableNestedReplies && replyCount > 0 && (
                  <button
                    onClick={toggleReplies}
                    className="text-blue-500 text-sm mt-2 hover:underline flex items-center"
                  >
                    {isLoadingReplies
                      ? "Loading replies..."
                      : showReplies
                        ? "Hide replies"
                        : `Show ${replyCount} replies`}
                  </button>
                )}
              </div>
            </div>
          )}
          {isComment &&
            !disableNestedReplies &&
            showReplies &&
            nestedReplies.length > 0 && (
              <div className="nested-replies">
                {nestedReplies.map((reply) => (
                  <PostCard
                    key={reply._id}
                    item={reply}
                    author={reply.author}
                    isReply={true}
                    depth={depth + 1}
                    parentAuthor={author}
                    disableNestedReplies={disableNestedReplies}
                    postId={propPostId}
                    onDelete={onDelete}
                    isComment={true}
                    hideActionsHeader={hideActionsHeader}
                    hideActions={hideActions}
                    removeOnUnsave={removeOnUnsave}
                  />
                ))}
              </div>
            )}
        </div>
      </div>

      {isReplyOpen && (
        <Reply
          isOpen={isReplyOpen}
          onClose={() => setIsReplyOpen(false)}
          postId={isComment ? propPostId : id}
          commentId={isComment ? id : null}
          parentId={isComment ? id : null}
          onReplyAdded={(newReply) => {
            setNestedReplies((prev) => [newReply, ...prev]);
            setShowReplies(true);
            setIsRepliesLoaded(true);
          }}
        />
      )}
      {isQuoteOpen && (
        <CreatePost
          isOpen={isQuoteOpen}
          onClose={() => setIsQuoteOpen(false)}
          onPostCreated={onUpdate}
          quotedPost={isComment ? null : data}
          quotedComment={isComment ? data : null}
          quotedAuthor={author}
        />
      )}
      {selectedImage && (
        <MediaModal selectedImage={selectedImage} closeModal={closeModal} />
      )}
      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => {
          setIsDeleteModalOpen(false);
          if (onCancel) onCancel();
        }}
        className="bg-[#1A1A1A] rounded-lg max-w-[300px] mx-auto border border-neutral-700 z-[1000]"
        overlayClassName="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000]"
      >
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-center px-4 pt-4">
            Delete {isDraft ? "draft" : isComment ? "comment" : "post"}?
          </h2>
          <p className="mt-2 text-neutral-400 text-center px-4 border-b border-neutral-700 pb-4">
            If you delete this{" "}
            {isDraft ? "draft" : isComment ? "comment" : "post"}, you won’t be
            able to restore it.
          </p>
          <div className="flex justify-between mx-2">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                if (onCancel) onCancel();
              }}
              className="flex-1 py-2 my-2 font-medium rounded-lg hover:bg-neutral-700"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <span className="border-r border-neutral-700 mx-2" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="flex-1 py-2 my-2 text-red-500 font-medium rounded-lg hover:bg-neutral-800"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {isProfileModalOpen && author && (
        <ProfileCard
          name={author.name}
          username={author.username}
          bio={author.bio || ""}
          followers={author.followers?.length || 0}
          following={userAuth?.following || []}
          profilePic={author.profilePic || "https://via.placeholder.com/96"}
          isPrivate={author.isPrivate || false}
          isVerified={author.isVerified || false}
          isModal={true}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
};

export default PostCard;
