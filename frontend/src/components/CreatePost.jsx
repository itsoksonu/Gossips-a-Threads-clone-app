import React, {
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Icons } from "./icons";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import PostCard from "./PostCard";

const CreatePost = ({
  isOpen,
  onClose,
  onPostCreated,
  quotedPost,
  quotedComment,
  quotedAuthor,
}) => {
  const {
    userAuth,
    userAuth: { token },
  } = useContext(UserContext);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [showDraftPostsDialog, setShowDraftPostsDialog] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftsPage, setDraftsPage] = useState(1);
  const [hasMoreDrafts, setHasMoreDrafts] = useState(true);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isReplyDropdownOpen, setIsReplyDropdownOpen] = useState(false);
  const [replyText, setReplyText] = useState("Anyone can reply & quote");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const cardRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const replyDropdownRef = useRef(null);
  const observer = useRef();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        if (content.trim() || mediaFiles.length > 0) {
          setShowSaveDraftDialog(true);
        } else {
          onClose();
        }
        setIsMoreDropdownOpen(false);
        setIsReplyDropdownOpen(false);
      } else {
        if (
          moreDropdownRef.current &&
          !moreDropdownRef.current.contains(event.target)
        ) {
          setIsMoreDropdownOpen(false);
        }
        if (
          replyDropdownRef.current &&
          !replyDropdownRef.current.contains(event.target)
        ) {
          setIsReplyDropdownOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose, content, mediaFiles]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (showDraftPostsDialog) {
      fetchDrafts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDraftPostsDialog, draftsPage]);

  useEffect(() => {
    const isAnyModalOpen =
      isOpen || showSaveDraftDialog || showDraftPostsDialog;
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, showSaveDraftDialog, showDraftPostsDialog]);

  const resetForm = () => {
    setContent("");
    setMediaFiles([]);
    setError("");
    setDrafts([]);
    setDraftsPage(1);
    setHasMoreDrafts(true);
    setIsMoreDropdownOpen(false);
    setIsReplyDropdownOpen(false);
    setReplyText("Anyone can reply & quote");
  };

  const fetchDrafts = async () => {
    if (!token || isDraftsLoading || !hasMoreDrafts) return;

    setIsDraftsLoading(true);
    try {
      const response = await axios.get(
        import.meta.env.VITE_SERVER + "/posts/drafts",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: draftsPage,
            limit: 10,
          },
        }
      );

      const newDrafts = response.data.drafts.filter(
        (draft) => !drafts.some((d) => d._id === draft._id)
      );

      setDrafts((prevDrafts) => [...prevDrafts, ...newDrafts]);
      setHasMoreDrafts(response.data.pagination?.totalPages > draftsPage);
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    } finally {
      setIsDraftsLoading(false);
    }
  };

  const lastDraftRef = useCallback(
    (node) => {
      if (isDraftsLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreDrafts) {
            setDraftsPage((prevPage) => prevPage + 1);
          }
        },
        { threshold: 0.5 }
      );

      if (node) observer.current.observe(node);
    },
    [isDraftsLoading, hasMoreDrafts]
  );

  if (!isOpen && !showDraftPostsDialog) return null;

  const handleContentChange = (e) => {
    setContent(e.target.value);
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + mediaFiles.length > 5) {
      setError("You can only upload up to 5 files");
      return;
    }
    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );
    if (validFiles.length !== files.length) {
      setError("Only images and videos are allowed");
    }
    setMediaFiles([...mediaFiles, ...validFiles]);
    setError("");
  };

  const removeFile = (index) => {
    const newFiles = [...mediaFiles];
    newFiles.splice(index, 1);
    setMediaFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0 && !quotedPost && !quotedComment) {
      setError("Post must have content, media, or a quote");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("isDraft", "false");
      if (quotedPost) {
        formData.append("quotedPost", quotedPost._id);
        formData.append("isQuoteRepost", true);
      }
      if (quotedComment) {
        formData.append("quotedComment", quotedComment._id);
        formData.append("isQuoteComment", true);
      }
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });
      const response = await axios.post(
        import.meta.env.VITE_SERVER + "/posts/create",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.status === 201) {
        toast.success("Posted");
        if (typeof onPostCreated === "function") {
          onPostCreated(response.data.post);
        }
        resetForm();
        setTimeout(onClose, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDraft = async () => {
    if (!content.trim() && mediaFiles.length === 0 && !quotedPost && !quotedComment) {
      setError("Draft must have content, media, or a quote");
      return;
    }
    setIsSavingDraft(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("isDraft", "true");
      if (quotedPost) {
        formData.append("quotedPost", quotedPost._id);
        formData.append("isQuoteRepost", true);
      }
      if (quotedComment) {
        formData.append("quotedComment", quotedComment._id);
        formData.append("isQuoteComment", true);
      }
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });
      await axios.post(
        import.meta.env.VITE_SERVER + "/posts/save-draft",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success("Saved to drafts");
      resetForm();
      setShowSaveDraftDialog(false);
      onClose();
    } catch {
      setError("Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleLoadDraft = (draftId) => {
    const draft = drafts.find((d) => d._id === draftId);
    setContent(draft.content || "");
    const mediaWithTypes = draft.media
      ? draft.media.map((url) => ({
          url,
          type:
            url.endsWith(".mp4") ||
            url.endsWith(".webm") ||
            url.endsWith(".ogg")
              ? "video/*"
              : url.endsWith(".jpg") ||
                url.endsWith(".jpeg") ||
                url.endsWith(".png") ||
                url.endsWith(".gif")
              ? "image/*"
              : "unknown",
        }))
      : [];
    setMediaFiles(mediaWithTypes);
    setShowDraftPostsDialog(false);
  };

  const handleImageButtonClick = () => {
    fileInputRef.current.click();
  };

  const isVideo = (mediaUrl) => {
    return (
      mediaUrl.endsWith(".mp4") ||
      mediaUrl.endsWith(".webm") ||
      mediaUrl.endsWith(".ogg")
    );
  };

  if (showSaveDraftDialog) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
        <div className="bg-neutral-900 w-full max-w-[300px] rounded-2xl border border-neutral-600 text-center">
          <h2 className="text-lg font-medium text-white px-6 py-4">
            Save to drafts?
          </h2>
          <p className="text-gray-400 border-b pb-4 border-neutral-700 px-6">
            Save to drafts to edit and post at a later time.
          </p>
          <div className="flex flex-col justify-center items-center">
            <button
              className={`py-4 w-full cursor-pointer font-bold border-b border-neutral-700 ${isSavingDraft ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={handleSaveToDraft}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? "Saving..." : "Save"}
            </button>
            <button
              className="py-4 w-full border-b border-neutral-700 text-red-500 cursor-pointer"
              onClick={() => {
                resetForm();
                setShowSaveDraftDialog(false);
                onClose();
              }}
            >
              Don't save
            </button>
            <button
              className="w-full py-4 cursor-pointer"
              onClick={() => setShowSaveDraftDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDraftPostsDialog) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
        <div className="bg-neutral-900 w-full max-w-[600px] rounded-2xl border border-neutral-600 overflow-hidden">
          <div className="flex relative items-center justify-center p-4 border-b border-neutral-700">
            <button
              onClick={() => {
                setShowDraftPostsDialog(false);
                if (!isOpen) onClose();
              }}
              className="text-md hover:text-red-500 transition-colors cursor-pointer absolute left-4"
            >
              <Icons.back />
            </button>
            <p className="font-medium text-lg">Drafts</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pt-4">
            {drafts.length > 0 ? (
              drafts.map((draft, index) => {
                const isLastDraft = index === drafts.length - 1;
                return (
                  <div
                    key={draft._id}
                    ref={isLastDraft ? lastDraftRef : null}
                    onClick={() => handleLoadDraft(draft._id)}
                    className="cursor-pointer mb-4 border-b border-neutral-700 px-4"
                  >
                    <PostCard
                      item={draft}
                      author={userAuth}
                      hideActionsHeader={false}
                      hideActions={true}
                      isDraft={true}
                      onDelete={(id) => {
                        setDrafts(drafts.filter((d) => d._id !== id));
                        fetchDrafts();
                      }}
                      onCancel={() => {
                        setShowDraftPostsDialog(true);
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-neutral-400">
                {isDraftsLoading ? (
                  <Icons.spinner className="animate-spin mx-auto h-8 w-8" />
                ) : (
                  <div>
                    <Icons.draft className="h-16 w-16 mx-auto mb-2" />
                    <p className="font-medium">No drafts yet</p>
                    <p className="text-sm">Your drafts will appear here.</p>
                     </div>
                )}
              </div>
            )}
            {isDraftsLoading && drafts.length > 0 && (
              <div className="flex justify-center py-4">
                <Icons.spinner className="animate-spin h-8 w-8 text-neutral-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
      <div
        ref={cardRef}
        className="bg-neutral-900 w-full max-w-[600px] rounded-2xl border border-neutral-600 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              if (content.trim() || mediaFiles.length > 0) {
                setShowSaveDraftDialog(true);
              } else {
                onClose();
              }
            }}
            className="text-md hover:text-red-500 transition-colors cursor-pointer"
            disabled={isLoading}
          >
            Cancel
          </button>
          <p className="font-medium text-lg">
            {quotedPost ? "Quote Post" : quotedComment ? "Quote Comment" : "New gossip"}
          </p>
          <div className="flex gap-4">
            <button
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              onClick={() => setShowDraftPostsDialog(true)}
            >
              <Icons.draft className="h-6 w-6" />
            </button>

            <div className="relative mt-1" ref={moreDropdownRef}>
              <button
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              >
                <Icons.more className="h-6 w-6" />
              </button>
              {isMoreDropdownOpen && (
                <div className="absolute right-0 mt-1 w-[250px] bg-[#181818] rounded-2xl border border-neutral-700 shadow-xl z-[999]">
                  <div className="p-2">
                    <button
                      className="w-full flex justify-between items-center p-3 tracking-normal select-none font-semibold text-[15px] text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                      onClick={() => setIsMoreDropdownOpen(false)}
                    >
                      <span>Add AI label</span>
                      <Icons.ai />
                    </button>
                    <hr className="my-1 -mx-2 border-neutral-800" />
                    <button
                      className="w-full flex justify-between items-center p-3 tracking-normal select-none font-semibold text-[15px] text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                      onClick={() => setIsMoreDropdownOpen(false)}
                    >
                      <span>Schedule...</span>
                      <Icons.schedule />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <hr className="border-neutral-600" />
        <div className="p-4">
          <div className="flex gap-3">
            <img
              className="w-10 h-10 rounded-full flex items-center justify-center border border-neutral-500"
              src={userAuth.profilePic}
              alt="Profile"
            />
            <div className="flex-1">
              <p className="text-white font-medium">{userAuth.username}</p>
              <textarea
                ref={textareaRef}
                placeholder={quotedPost || quotedComment ? "Add your comment..." : "What's new?"}
                className="w-full bg-transparent text-gray-300 placeholder-gray-500 outline-none resize-none mt-1"
                value={content}
                onChange={handleContentChange}
                maxLength={500}
                rows={1}
                style={{ overflow: "hidden" }}
              />
              {quotedPost && quotedAuthor && (
                <div className="mt-4 p-3 border border-neutral-700 rounded-lg">
                  <div className="flex gap-2">
                    <img
                      className="w-6 h-6 rounded-full object-cover"
                      src={quotedAuthor.profilePic}
                      alt="Quoted Profile"
                    />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {quotedAuthor.username}
                      </p>
                      <p className="text-gray-300 text-sm">
                        {quotedPost.content}
                      </p>
                      {quotedPost.media && quotedPost.media.length > 0 && (
                        <div className="mt-2 flex flex-row gap-2 overflow-x-auto scrollbar-hide">
                          {quotedPost.media.map((media, index) => (
                            <div key={index} className="flex-shrink-0">
                              {isVideo(media) ? (
                                <video
                                  src={media}
                                  controls
                                  className="w-24 h-24 rounded-lg object-cover"
                                />
                              ) : (
                                <img
                                  src={media}
                                  alt="Quoted Media"
                                  className="w-24 h-24 rounded-lg object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {quotedComment && quotedAuthor && (
                <div className="mt-4 p-3 border border-neutral-700 rounded-lg">
                  <div className="flex gap-2">
                    <img
                      className="w-6 h-6 rounded-full object-cover"
                      src={quotedAuthor.profilePic}
                      alt="Quoted Profile"
                    />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {quotedAuthor.username}
                      </p>
                      <p className="text-gray-300 text-sm">
                        {quotedComment.content}
                      </p>
                      {quotedComment.media && quotedComment.media.length > 0 && (
                        <div className="mt-2 flex flex-row gap-2 overflow-x-auto scrollbar-hide">
                          {quotedComment.media.map((media, index) => (
                            <div key={index} className="flex-shrink-0">
                              {isVideo(media) ? (
                                <video
                                  src={media}
                                  controls
                                  className="w-24 h-24 rounded-lg object-cover"
                                />
                              ) : (
                                <img
                                  src={media}
                                  alt="Quoted Media"
                                  className="w-24 h-24 rounded-lg object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {mediaFiles.length > 0 && (
                <div className="mt-3 flex flex-row gap-2 overflow-x-auto scrollbar-hide">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="relative flex-shrink-0 group">
                      {file.type && file.type.startsWith("image/") ? (
                        <img
                          src={
                            file.url ? file.url : URL.createObjectURL(file)
                          }
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : file.type && file.type.startsWith("video/") ? (
                        <video
                          src={
                            file.url ? file.url : URL.createObjectURL(file)
                          }
                          controls
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-24 h-24">
                          <Icons.image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        className="absolute top-1 right-1 bg-black/80 rounded-full p-2 text-white z-20"
                        onClick={() => removeFile(index)}
                      >
                        <Icons.close className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
              />
              <div className="flex items-center gap-4 mt-4">
                <button
                  className="text-neutral-500 hover:text-blue-500 transition-colors cursor-pointer"
                  onClick={handleImageButtonClick}
                >
                  <Icons.image className="h-5 w-5" />
                </button>
                <button className="text-neutral-500">
                  <Icons.gif className="h-5 w-5" />
                </button>
                <button className="text-neutral-500">
                  <Icons.hashtag className="h-5 w-5" />
                </button>
                <button className="text-neutral-500">
                  <Icons.poll className="h-5 w-5" />
                </button>
                <button className="text-neutral-500">
                  <Icons.location className="h-5 w-5" />
                </button>
                {content.length > 0 && (
                  <span className="text-sm text-neutral-500 ml-auto">
                    {content.length}/500
                  </span>
                )}
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="relative" ref={replyDropdownRef}>
                  <p
                    className="text-neutral-500 cursor-pointer"
                    onClick={() => setIsReplyDropdownOpen(!isReplyDropdownOpen)}
                  >
                    {replyText}
                  </p>
                  {isReplyDropdownOpen && (
                    <div className="absolute left-0 bottom-[100%] mb-1 w-[250px] bg-[#181818] rounded-2xl border border-neutral-700 shadow-xl z-[999]">
                      <div className="p-2">
                        <button
                          className="w-full flex justify-between items-center p-3 tracking-normal select-none font-semibold text-[15px] text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                          onClick={() => {
                            setReplyText("Anyone can reply & quote");
                            setIsReplyDropdownOpen(false);
                          }}
                        >
                          <span>Anyone</span>
                        </button>
                        <button
                          className="w-full flex justify-between items-center p-3 tracking-normal select-none font-semibold text-[15px] text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                          onClick={() => {
                            setReplyText("Profiles you follow can reply & quote");
                            setIsReplyDropdownOpen(false);
                          }}
                        >
                          <span>Profiles you follow</span>
                        </button>
                        <button
                          className="w-full flex justify-between items-center p-3 tracking-normal select-none font-semibold text-[15px] text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                          onClick={() => {
                            setReplyText("Profiles you mention can reply & quote");
                            setIsReplyDropdownOpen(false);
                          }}
                        >
                          <span>Mentioned only</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className={`px-4 py-1.5 rounded-2xl font-medium ${
                    isLoading || (!content.trim() && mediaFiles.length === 0 && !quotedPost && !quotedComment)
                      ? "border text-neutral-600 cursor-not-allowed"
                      : "bg-white text-black hover:bg-gray-200 transition-colors"
                  }`}
                  onClick={handleSubmit}
                  disabled={
                    isLoading || (!content.trim() && mediaFiles.length === 0 && !quotedPost && !quotedComment)
                  }
                >
                  {isLoading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
