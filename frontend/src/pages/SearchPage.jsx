import React, { useContext, useEffect, useState } from "react";
import SiteHeader from "../components/layouts/site-header";
import MobileNavbar from "../components/layouts/mobile-navbar";
import { Icons } from "../components/icons";
import { UserContext } from "../contexts/UserContext";
import axios from "axios";
import SearchUserCard from "../components/SearchUserCard";
import CreatePost from "../components/CreatePost";
import { Navigate, useNavigate } from "react-router";
import FollowButton from "../components/FollowButton";

const SearchPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const {
    userAuth,
    userAuth: { token },
  } = useContext(UserContext);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const layoutContext = {
    openCreateModal,
    closeCreateModal,
  };

  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          import.meta.env.VITE_SERVER + "/user/users",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setUsers(response.data);
      } catch (error) {
        console.error(
          "Error fetching users:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(true);
    const filtered = users.filter((user) => {
      const matchesUsername = user.username
        ?.toLowerCase()
        .includes(query.toLowerCase());
      const matchesName = user.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return matchesUsername || matchesName;
    });

    setFilteredUsers(filtered);
  };

  const SearchResultCard = ({ user }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
      navigate(`/${user.username}`);
    };

    return !userAuth.token ? (
      <Navigate to="/login" />
    ) : (
      <div
        className="text-white w-full border-b border-neutral-800 px-3 py-3 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-3">
          <div className="cursor-pointer">
            <img
              className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
              src={user.profilePic}
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

              {userAuth.username === user.username ? (
                ""
              ) : (
                <div className="absolute right-0 flex items-center bg-neutral-900 h-10 w-26 justify-center rounded-xl">
                  <FollowButton
                    username={user.username}
                    currentUserFollowing={user.following}
                    isPrivate={user.isPrivate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const suggestedUsers = users.filter(
    (user) => user.username !== userAuth.username
  );

  return (
    <div className="w-full bg-neutral-950">
      <SiteHeader layoutContext={layoutContext} />
      <main className="container max-w-[620px] px-4 sm:px-6 bg-neutral-950 mx-auto pb-16">
        <div className="flex justify-center items-center relative">
          <input
            className="border border-neutral-800 rounded-xl outline-0 flex items-center justify-center w-full mx-auto py-5 px-12 mt-4 bg-neutral-950 text-white"
            placeholder="Search"
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
                .map((user) => <SearchResultCard key={user._id} user={user} />)
            ) : (
              <div className="p-4 text-center text-neutral-400">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-neutral-500 font-medium my-4 ml-2">
              Follow suggestions
            </p>
            <div className="mt-4 space-y-4">
              {suggestedUsers.length > 0 ? (
                suggestedUsers.map((user) => (
                  <div key={user._id}>
                    <SearchUserCard user={user} />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-neutral-400">
                  {loading ? (
                    <Icons.spinner className="animate-spin mx-auto" />
                  ) : (
                    "No users available yet."
                  )}
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

export default SearchPage;
