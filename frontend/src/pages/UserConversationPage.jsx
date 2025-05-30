import React, { useContext, useState, useEffect, useRef } from "react";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { Icons } from "../components/icons";
import EmojiPicker from "emoji-picker-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const UserConversationPage = () => {
  const { userAuth } = useContext(UserContext);
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState([]);
  const socket = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userAuth?.token) {
      navigate("/login");
      return;
    }

    const newSocket = io(`${import.meta.env.VITE_SERVER}`, {
      auth: { token: userAuth.token },
      query: { userId: userAuth.id },
    });
    socket.current = newSocket;

    newSocket.on("connect", () => {
      if (userAuth.id) {
        newSocket.emit("join", userAuth.id);
      } else {
        console.error("userAuth.id is null or undefined, cannot join room");
      }
    });

    newSocket.on("receiveMessage", (message) => {
      if (
        (message.sender.toString() === userAuth.id &&
          message.receiverUsername === username) ||
        (message.senderUsername === username &&
          message.receiver.toString() === userAuth.id)
      ) {
        setMessages((prev) => {
          // Check for a temporary message with matching tempId
          const tempMessageIndex = prev.findIndex(
            (m) => m.tempId && m.tempId === message.tempId
          );
          
          if (tempMessageIndex !== -1) {
            // Replace the temporary message with the server message
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = {
              ...message,
              isOwn: message.sender.toString() === userAuth.id,
              isUploading: false,
            };
            return newMessages.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          }
          
          // If no matching temp message, check if message already exists by _id
          const exists = prev.find((m) => m._id === message._id);
          if (!exists) {
            return [
              ...prev,
              { ...message, isOwn: message.sender.toString() === userAuth.id },
            ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          
          return prev;
        });
        
        if (message.receiver.toString() === userAuth.id && !message.isRead) {
          markAsRead(message._id);
        }
      }
    });

    fetchUserAndMessages();

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAuth, username, navigate]);

  const fetchUserAndMessages = async () => {
    setLoading(true);
    try {
      const [userResponse, messagesResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_SERVER}/user/${username}`, {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }),
        axios.get(`${import.meta.env.VITE_SERVER}/chats/messages/${username}`, {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }),
      ]);
      setSelectedUser(userResponse.data);
      setMessages(
        messagesResponse.data.messages.map((msg) => ({
          ...msg,
          isOwn: msg.sender.toString() === userAuth.id,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching user or messages:", error);
      if (error.response?.status === 404) {
        navigate("/chat");
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (messageId) => {
    socket.current.emit("markAsRead", { messageId, receiverId: userAuth.id });
  };

  const sendMessage = async (media = []) => {
    if (!newMessage.trim() && media.length === 0) return;
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const messageData = {
      _id: tempId,
      tempId,
      sender: userAuth.id,
      receiver: selectedUser._id,
      receiverUsername: username,
      content: newMessage,
      media,
      createdAt: new Date().toISOString(),
      isUploading: !!media.length,
      isOwn: true,
    };

    // Add temporary message to state
    setMessages((prev) => [...prev, messageData].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ));

    socket.current.emit("sendMessage", {
      senderId: userAuth.id,
      receiverId: selectedUser._id,
      receiverUsername: username,
      content: newMessage,
      media,
      createdAt: new Date().toISOString(),
      tempId,
    });

    setNewMessage("");
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const fetchGifs = async (query = "") => {
    try {
      const response = await axios.get(
        `https://api.giphy.com/v1/gifs/search?api_key=${
          import.meta.env.VITE_GIPHY_API_KEY
        }&q=${query}&limit=20`
      );
      setGifs(response.data.data);
    } catch (error) {
      console.error("Error fetching GIFs:", error);
    }
  };

  const handleGifClick = async (gif) => {
    const media = [{ type: "gif", url: gif.images.fixed_height.url }];
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMessage = {
      _id: tempId,
      tempId,
      sender: userAuth.id,
      receiver: selectedUser._id,
      receiverUsername: username,
      content: "",
      media,
      createdAt: new Date().toISOString(),
      isUploading: true,
      isOwn: true,
    };

    // Add temporary GIF message
    setMessages((prev) => [...prev, tempMessage].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ));

    // Emit the message
    socket.current.emit("sendMessage", {
      senderId: userAuth.id,
      receiverId: selectedUser._id,
      receiverUsername: username,
      content: "",
      media,
      createdAt: new Date().toISOString(),
      tempId,
    });

    setShowGifPicker(false);
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMedia = [{
      type: file.type.startsWith("image/") ? "image" : "video",
      url: URL.createObjectURL(file), // Temporary local URL for preview
    }];
    const tempMessage = {
      _id: tempId,
      tempId,
      sender: userAuth.id,
      receiver: selectedUser._id,
      receiverUsername: username,
      content: "",
      media: tempMedia,
      createdAt: new Date().toISOString(),
      isUploading: true,
      isOwn: true,
    };

    // Add temporary message with local URL
    setMessages((prev) => [...prev, tempMessage].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER}/chats/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${userAuth.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update the temporary message with the actual URL
      const media = [
        { type: file.type.startsWith("image/") ? "image" : "video", url: response.data.url },
      ];
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId
            ? { ...msg, media, isUploading: false }
            : msg
        ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      );

      // Emit the message to the server
      socket.current.emit("sendMessage", {
        senderId: userAuth.id,
        receiverId: selectedUser._id,
        receiverUsername: username,
        content: "",
        media,
        createdAt: new Date().toISOString(),
        tempId,
      });
    } catch (error) {
      console.error("Error uploading media:", error);
      // Remove the temporary message on failure
      setMessages((prev) => prev.filter((msg) => msg.tempId !== tempId));
      alert("Failed to upload media");
    }
  };

  const handleRestrict = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER}/user/restrict/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );
      alert("User restricted successfully");
    } catch (error) {
      console.error("Error restricting user:", error);
      alert("Failed to restrict user");
    }
  };

  const handleBlock = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER}/user/block/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );
      navigate("/chat");
      alert("User blocked successfully");
    } catch (error) {
      console.error("Error blocking user:", error);
      alert("Failed to block user");
    }
  };

  const handleReport = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER}/user/report/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );
      alert("User reported successfully");
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Failed to report user");
    }
  };

  const handleDeleteChat = async () => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_SERVER}/chats/delete/${username}`,
        {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );
      navigate("/chat");
      alert("Chat deleted successfully");
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat");
    }
  };

  const formatInstagramTimestamp = (dateString) => {
    const messageDate = new Date(dateString);
    const now = new Date();

    const isToday = messageDate.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.setDate(now.getDate() - 1)).toDateString() ===
      messageDate.toDateString();

    now.setDate(now.getDate() + 1);

    const dayDiff = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    const hours = messageDate.getHours() % 12 || 12;
    const minutes = messageDate.getMinutes().toString().padStart(2, "0");
    const ampm = messageDate.getHours() >= 12 ? "pm" : "am";
    const timeStr = `${hours}:${minutes} ${ampm}`;

    const isCurrentYear = messageDate.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday ${timeStr}`;
    } else if (dayDiff < 7) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `${days[messageDate.getDay()]} ${timeStr}`;
    } else if (isCurrentYear) {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${messageDate.getDate()} ${months[messageDate.getMonth()]}, ${timeStr}`;
    } else {
      const day = messageDate.getDate().toString().padStart(2, "0");
      const month = (messageDate.getMonth() + 1).toString().padStart(2, "0");
      return `${day}-${month}-${messageDate.getFullYear()}`;
    }
  };

  const shouldShowTimestamp = (currentGroup, nextGroup) => {
    if (!nextGroup) return true;

    const currentGroupTime = new Date(
      currentGroup[currentGroup.length - 1].createdAt
    );
    const nextGroupTime = new Date(nextGroup[0].createdAt);

    const hoursDiff = (nextGroupTime - currentGroupTime) / (1000 * 60 * 60);
    return (
      currentGroupTime.getHours() !== nextGroupTime.getHours() ||
      hoursDiff >= 0.5
    );
  };

  const getMessageIndicator = (message, isOwn) => {
    if (isOwn) {
      const isLastMessage = message._id === messages[messages.length - 1]?._id;
      if (isLastMessage) {
        return message.isRead ? "Seen" : message.isUploading ? "Uploading" : "Delivered";
      }
    }
    return null;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showGifPicker) {
      fetchGifs();
    }
  }, [showGifPicker]);

  if (!userAuth?.token) return <div>Please log in to chat.</div>;

  const groupMessages = () => {
    const grouped = [];
    let currentGroup = [];

    messages.forEach((message) => {
      const isOwn = message.sender.toString() === userAuth.id;

      if (
        currentGroup.length === 0 ||
        currentGroup[0].isOwn !== isOwn ||
        new Date(message.createdAt) -
          new Date(currentGroup[currentGroup.length - 1].createdAt) >
          2 * 60 * 1000
      ) {
        if (currentGroup.length > 0) {
          grouped.push(currentGroup);
        }
        currentGroup = [];
      }

      currentGroup.push({ ...message, isOwn });
    });

    if (currentGroup.length > 0) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  const messageGroups = groupMessages();

  return (
    <div className="max-w-2xl mx-auto bg-black min-h-screen text-white flex flex-col">
      <header className="fixed top-0 w-full max-w-2xl z-10 bg-black border-b border-neutral-800 py-4 px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/chat")}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <Icons.back className="w-5 h-5" strokeColor="currentColor" />
          </button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => navigate(`/${selectedUser?.username}`)}
          >
            <div className="relative">
              <img
                src={selectedUser?.profilePic || "/default-avatar.png"}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-neutral-700 cursor-pointer"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-black"></div>
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-base">
                {selectedUser?.name || "Gossips User"}
              </h2>
              <p className="text-xs text-neutral-400">
                {selectedUser?.username || username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-white cursor-pointer">
                  <Icons.about className="w-6 h-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="shadow-xl bg-[#181818] z-[999] rounded-2xl w-[220px] mt-1 p-0 border border-neutral-700"
              >
                <DropdownMenuItem
                  onClick={handleRestrict}
                  className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mt-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 focus:rounded-xl outline-none"
                >
                  <span>Restrict</span>
                  <Icons.restrict />
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleBlock}
                  className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 focus:rounded-xl outline-none"
                >
                  <span>Block</span>
                  <Icons.block />
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleReport}
                  className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 focus:rounded-xl outline-none"
                >
                  <span>Report</span>
                  <Icons.report className="w-5 h-5" />
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleDeleteChat}
                  className="flex justify-between items-center p-3 mx-2 mb-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950 text-red-500 hover:bg-neutral-800 focus:rounded-xl outline-none"
                >
                  <span>Delete Chat</span>
                  <Icons.delete />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 pt-20 pb-16 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col items-center justify-center mt-6 mb-8 px-4">
          <div className="relative">
            <img
              src={selectedUser?.profilePic || "/default-avatar.png"}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-neutral-700"
            />
          </div>
          <h3 className="mt-4 font-medium">{selectedUser?.name}</h3>
          <p>{selectedUser?.username}</p>
          <p className="text-sm text-neutral-400 mt-1">
            {selectedUser?.followers.length} followers
          </p>
          <button
            className="bg-neutral-900 rounded-xl py-2 px-3 mt-2 font-medium text-center text-sm cursor-pointer hover:bg-neutral-800 transition-colors"
            onClick={() => navigate(`/${selectedUser?.username}`)}
          >
            View profile
          </button>
        </div>

        <div className="pb-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Icons.spinner className="animate-spin w-6 h-6 text-neutral-400" />
            </div>
          ) : (
            messageGroups.map((group, groupIndex) => {
              const isOwn = group[0].isOwn;
              const showTimestamp =
                shouldShowTimestamp(group, messageGroups[groupIndex + 1]) ||
                groupIndex === 0;

              return (
                <React.Fragment key={`group-${groupIndex}`}>
                  {showTimestamp && (
                    <div className="text-center text-xs text-neutral-500 my-4">
                      {formatInstagramTimestamp(
                        group[group.length - 1].createdAt
                      )}
                    </div>
                  )}

                  <div
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} px-3 mb-3`}
                  >
                    {!isOwn && groupIndex >= 0 && (
                      <div className="mr-2 self-end mb-1">
                        <img
                          src={
                            selectedUser?.profilePic || "/default-avatar.png"
                          }
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                        />
                      </div>
                    )}
                    <div className="max-w-[70%]">
                      {group.map((message, msgIndex) => (
                        <div
                          key={message._id}
                          className={`px-4 py-2 relative ${message.media?.length && !message.content ? "" : group.length === 1
                            ? "rounded-2xl"
                            : msgIndex === 0
                            ? `rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`
                            : msgIndex === group.length - 1
                            ? `rounded-2xl ${isOwn ? "rounded-tr-md" : "rounded-tl-md"}`
                            : `${isOwn ? "rounded-r-md" : "rounded-l-md"} rounded-md`
                          } ${message.media?.length && !message.content ? "" : isOwn
                              ? "bg-violet-600 text-white"
                              : "bg-neutral-800 text-white"
                          } ${msgIndex !== 0 ? "mt-0.5" : ""}`}
                        >
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                          {message.media?.map((item, idx) => (
                            <div key={idx} className="mt-2 relative">
                              {item.type === "image" && (
                                <img
                                  src={item.url}
                                  alt="Media"
                                  className="max-w-full rounded-lg"
                                />
                              )}
                              {item.type === "gif" && (
                                <img
                                  src={item.url}
                                  alt="GIF"
                                  className="max-w-full rounded-lg"
                                />
                              )}
                              {item.type === "video" && (
                                <video
                                  src={item.url}
                                  controls
                                  className="max-w-full rounded-lg"
                                />
                              )}
                            </div>
                          ))}
                          
                          {/* Improved uploading indicator */}
                          {message.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-white text-xs font-medium">Uploading...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {getMessageIndicator(group[group.length - 1], isOwn) && (
                    <div
                      className={`text-xs text-neutral-400 mt-1 ${isOwn ? "text-right mr-4" : "text-left ml-4"}`}
                    >
                      {getMessageIndicator(group[group.length - 1], isOwn)}
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input */}
      <div className="fixed bottom-0 w-full max-w-2xl py-3 bg-black border-t border-neutral-800">
        <div className="flex items-center gap-2 px-2 relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-neutral-400 hover:text-white p-2 cursor-pointer"
          >
            <Icons.smile className="w-6 h-6" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-16 left-2 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 bg-neutral-800 text-sm text-white placeholder-neutral-400 focus:outline-none py-2 px-4 rounded-full"
          />

          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleMediaUpload}
            className="hidden"
          />

          {newMessage.trim() ? (
            <button
              onClick={() => sendMessage()}
              className="text-white px-3 py-1.5 cursor-pointer rounded-full bg-violet-600 hover:bg-violet-700 transition-colors"
            >
              Send
            </button>
          ) : (
            <div className="flex">
              <button
                onClick={() => fileInputRef.current.click()}
                className="text-neutral-400 hover:text-white p-2 cursor-pointer"
              >
                <Icons.image className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowGifPicker(!showGifPicker)}
                className="text-neutral-400 hover:text-white p-2 cursor-pointer"
              >
                <Icons.gif className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        {showGifPicker && (
          <div className="absolute bottom-16 right-2 bg-neutral-900 p-4 rounded-lg max-h-80 overflow-y-auto w-80">
            <input
              type="text"
              placeholder="Search GIFs..."
              onChange={(e) => fetchGifs(e.target.value)}
              className="w-full bg-neutral-800 text-white p-2 rounded mb-2"
            />
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  onClick={() => handleGifClick(gif)}
                  className="cursor-pointer rounded hover:opacity-80"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserConversationPage;
