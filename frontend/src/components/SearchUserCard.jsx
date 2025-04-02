import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "./icons";
import FollowButton from "./FollowButton";
import { UserContext } from "../contexts/UserContext";
import { useFollow } from "../contexts/FollowContext.jsx";

const SearchUserCard = ({ user }) => {
  let { profilePic, bio, name, followers, username, isVerified, isPrivate } = user;
  const navigate = useNavigate();
  const { userAuth } = useContext(UserContext);
  // eslint-disable-next-line no-unused-vars
  const { handleFollowUpdate } = useFollow();
  
  // Normalize the following data to ensure consistent format
  const following = Array.isArray(userAuth.following)
    ? userAuth.following.map((follow) => 
        typeof follow === 'object' ? follow.username : follow
      )
    : [];
  
  const handleCardClick = () => {
    navigate(`/${username}`);
  };
  
  const handleFollowChange = () => {
    // If needed, refresh the card data or update UI
  };
  
  return (
    <div
      className="text-white w-full border-b border-neutral-800 px-3 pb-4 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
      <div className="cursor-pointer">
          <img
            className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
            src={profilePic}
            alt="Profile"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 ">
          <div className="flex flex-row justify-start items-center relative ">
            <div className="cursor-pointer">
              <p className="text-white font-medium line-clamp-1 flex items-center hover:underline truncate">
                {username}
                {isVerified && (
                  <span className="pl-1 pt-0.5 inline-flex items-center">
                    <Icons.verified />
                  </span>
                )}
              </p>
              <p className="text-neutral-500">{name}</p>
            </div>
            <div className="absolute right-0 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-26">
              <FollowButton
                username={username}
                currentUserFollowing={following}
                isPrivate={isPrivate}
                onFollowStatusChange={handleFollowChange}
              />
            </div>
          </div>
          <p className=" mt-1">{bio}</p>
          <p className="text-neutral-500 mt-1">{followers.length} followers</p>
        </div>
      </div>
    </div>
  );
};
export default SearchUserCard;