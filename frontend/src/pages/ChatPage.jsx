import React, { useContext, useState, useEffect, useRef } from "react";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/layouts/site-header";
import MobileNavbar from "../components/layouts/mobile-navbar";
import { Icons } from "../components/icons";
import CreatePost from "../components/CreatePost";

const ChatPage = () => {
  const { userAuth } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const layoutContext = { openCreateModal, closeCreateModal };

  useEffect(() => {
    if (!userAuth?.token) return;

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
      handleNewMessage(message);
    });

    newSocket.on("messageRead", ({ messageId }) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.latestMessage._id === messageId
            ? { ...chat, latestMessage: { ...chat.latestMessage, isRead: true } }
            : chat
        )
      );
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
    });

    fetchUsers();
    fetchChats();

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAuth]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_SERVER}/user/users`, {
        headers: { Authorization: `Bearer ${userAuth.token}` },
      });
      setUsers(response.data.filter((u) => u._id !== userAuth.id));
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_SERVER}/chats`, {
        headers: { Authorization: `Bearer ${userAuth.token}` },
      });
      setChats(response.data.chats || []);
    } catch (error) {
      console.error("Error fetching chats:", error);
      setError("Failed to fetch chats: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserById = async (userId) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_SERVER}/user/${userId}`, {
        headers: { Authorization: `Bearer ${userAuth.token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  };

  const handleNewMessage = async (newMessage) => {
    if (!newMessage || !newMessage.sender || !newMessage.receiver || !newMessage.createdAt) {
      console.warn("Invalid message format:", newMessage);
      return;
    }

    const otherUserId = newMessage.sender.toString() === userAuth.id ? newMessage.receiver : newMessage.sender;

    let user = users.find((u) => u._id.toString() === otherUserId.toString());
    if (!user) {
      user = await fetchUserById(otherUserId);
      if (user) {
        setUsers((prev) => [...prev, user]);
      }
    } else {
      console.log("User found in local list:", user);
    }

    if (user) {
      setChats((prev) => {
        const updatedChats = [...prev];
        const existingChatIndex = updatedChats.findIndex((chat) => chat.user._id.toString() === otherUserId.toString());
        if (existingChatIndex !== -1) {
          updatedChats[existingChatIndex] = { user, latestMessage: newMessage };
        } else {
          updatedChats.push({ user, latestMessage: newMessage });
        }
        const deduplicatedChats = updatedChats.reduce((unique, current) => {
          const existing = unique.find((chat) => chat.user._id.toString() === current.user._id.toString());
          if (!existing) {
            unique.push(current);
          } else if (new Date(current.latestMessage.createdAt) > new Date(existing.latestMessage.createdAt)) {
            unique[unique.indexOf(existing)] = current;
          }
          return unique;
        }, []);
        return deduplicatedChats.sort((a, b) =>
          new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt)
        );
      });
    } else {
      console.error("No user found for message, skipping update");
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(true);
    const filtered = users.filter((user) => {
      const matchesUsername = user.username?.toLowerCase().includes(query.toLowerCase());
      const matchesName = user.name?.toLowerCase().includes(query.toLowerCase());
      return matchesUsername || matchesName;
    });
    setFilteredUsers(filtered);
  };

  const ChatResultCard = ({ chat }) => {
    const handleCardClick = () => {
      navigate(`/chat/${chat.user.username}`);
    };

    return (
      <div
        key={`${chat.user._id}-${chat.latestMessage._id}`}
        className="text-white w-full border-b border-neutral-800 px-3 py-3 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-3">
          <div className="cursor-pointer">
            <img
              className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
              src={chat.user.profilePic || "/default-avatar.png"}
              alt="Profile"
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-row justify-start items-center relative">
              <div className="cursor-pointer">
                <p className="text-white font-medium line-clamp-1 flex items-center hover:underline">
                  {chat.user.username}
                  {chat.user.isVerified && (
                    <span className="pl-1 pt-0.5 inline-flex items-center">
                      <Icons.verified />
                    </span>
                  )}
                </p>
                <p className="text-neutral-500">
                  {chat.latestMessage.content.length > 20
                    ? `${chat.latestMessage.content.slice(0, 20)}...`
                    : chat.latestMessage.content}
                </p>
              </div>
              {!chat.latestMessage.isRead && chat.latestMessage.receiver === userAuth.id && (
                <div className="absolute right-0 flex items-center  h-10 w-10 justify-center ">
                  <span className="text-2xl text-blue-400">•</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleUserSelect = (user) => {
    navigate(`/chat/${user.username}`);
  };

  if (!userAuth?.token) return <div>Please log in to chat.</div>;

  return (
    <div className="w-full bg-neutral-950 min-h-screen">
      <SiteHeader layoutContext={layoutContext} />
      <main className="container max-w-[620px] px-4 sm:px-6 bg-neutral-950 mx-auto py-4">
        <div className="flex justify-center items-center relative">
          <input
            className="border border-neutral-800 rounded-xl outline-0 flex items-center justify-center w-full mx-auto py-5 px-12 mt-4 bg-neutral-950 text-white"
            placeholder="Search users to chat"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Icons.search
            className="absolute left-0 ml-4 mt-4 w-5 h-5"
            strokeColor="#404040"
          />
        </div>

        {showSearchResults ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg mt-2 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center">
              <Icons.search className="w-5 h-5 mr-2" strokeColor="#404040" />
              <p className="font-medium mr-1">Search for "{searchQuery}"</p>
              <Icons.chevronRight
                className="w-5 h-5 mt-1"
                strokeColor="#6b7280"
              />
            </div>
            {filteredUsers.length > 0 ? (
              filteredUsers
                .slice(0, 5)
                .map((user) => (
                  <div
                    key={user._id}
                    className="text-white w-full border-b border-neutral-800 px-3 py-3 cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex gap-3">
                      <div className="cursor-pointer">
                        <img
                          className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
                          src={user.profilePic || "/default-avatar.png"}
                          alt="Profile"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-row justify-start items-center relative">
                          <div className="cursor-pointer">
                            <p className="text-white font-medium line-clamp-1 flex items-center hover:underline">
                              {user.username}
                              {user.isVerified && (
                                <span className="pl-1 pt-0.5 inline-flex items-center">
                                  <Icons.verified />
                                </span>
                              )}
                            </p>
                            <p className="text-neutral-500">{user.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-4 text-center text-neutral-400">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-neutral-500 font-medium my-4 ml-2">Recent Chats</p>
            <div className="mt-4 space-y-0">
              {loading ? (
                <div className="text-center py-10 text-neutral-400">
                  <Icons.spinner className="animate-spin mx-auto" />
                </div>
              ) : error ? (
                <div className="text-center py-10 text-red-400">
                  {error}
                </div>
              ) : chats.length > 0 ? (
                chats.map((chat) => <ChatResultCard key={`${chat.user._id}-${chat.latestMessage._id}`} chat={chat} />)
              ) : (
                <div className="text-center py-10 text-neutral-400">
                  No recent chats available.
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <CreatePost isOpen={isCreateModalOpen} onClose={closeCreateModal} />
      <MobileNavbar layoutContext={layoutContext} />
    </div>
  );
};

export default ChatPage;
