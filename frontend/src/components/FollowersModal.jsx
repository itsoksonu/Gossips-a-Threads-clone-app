import React, { useEffect, useState, useContext } from "react";
import Modal from "react-modal";
import InPageNavigation from "./InPageNavigation";
import { useNavigate } from "react-router";
import FollowButton from "./FollowButton";
import { Icons } from "./icons";
import { UserContext } from "../contexts/UserContext";
import { useFollow } from "../contexts/FollowContext.jsx";

Modal.setAppElement("#root");

const FollowersModal = ({
  isOpen,
  onClose,
  followers: initialFollowers,
  following: initialFollowing,
  username,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const { userAuth } = useContext(UserContext);
  const { followUpdates } = useFollow();
  const [followers, setFollowers] = useState(initialFollowers);
  const [following, setFollowing] = useState(initialFollowing);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!userAuth?.following) return;

    const updatedFollowers = initialFollowers.map((follower) => {
      const isFollowing = userAuth.following.some(
        (f) => (typeof f === "object" ? f.username : f) === follower.username
      );
      return { ...follower, isFollowing };
    });
    setFollowers(updatedFollowers);

    const updatedFollowing = initialFollowing.map((followedUser) => {
      const isFollowing = userAuth.following.some(
        (f) =>
          (typeof f === "object" ? f.username : f) === followedUser.username
      );
      return { ...followedUser, isFollowing };
    });
    setFollowing(updatedFollowing);
  }, [userAuth?.following, initialFollowers, initialFollowing, followUpdates]);

  const renderFollowersTab = () => {
    const handleProfileClick = (followerUsername) => {
      navigate(`/${followerUsername}`);
      onClose();
    };

    return (
      <div className="space-y-4 mt-4 mx-2">
        {followers.length > 0 ? (
          followers.map((follower) => (
            <div
              key={follower.username}
              className="text-white w-full border-b border-neutral-800 px-3 pb-4"
            >
              <div className="flex gap-3">
                <div
                  className="cursor-pointer"
                  onClick={() => handleProfileClick(follower.username)}
                >
                  <img
                    className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
                    src={follower.profilePic}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-row justify-start items-center relative">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleProfileClick(follower.username)}
                    >
                      <p className="text-white font-medium line-clamp-1 flex items-center hover:underline">
                        {follower.username}
                        {follower.isVerified && (
                          <span className="pl-1 pt-0.5 inline-flex items-center">
                            <Icons.verified />
                          </span>
                        )}
                      </p>
                      <p className="text-neutral-500">{follower.name}</p>
                    </div>
                    {userAuth?.username === follower.username ? (
                      ""
                    ) : (
                      <div className="absolute right-0 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-26">
                        <FollowButton
                          username={follower.username}
                          currentUserFollowing={
                            userAuth?.following || follower.following
                          }
                          isPrivate={follower.isPrivate}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-neutral-400">
            {username} has no followers yet.
          </div>
        )}
      </div>
    );
  };

  const renderFollowingTab = () => {
    const handleProfileClick = (followedUsername) => {
      navigate(`/${followedUsername}`);
      onClose();
    };

    return (
      <div className="space-y-4 mt-4 mx-2">
        {following.length > 0 ? (
          following.map((followedUser) => (
            <div
              key={followedUser.username}
              className="text-white w-full border-b border-neutral-800 px-3 pb-4"
            >
              <div className="flex gap-3">
                <div
                  className="cursor-pointer"
                  onClick={() => handleProfileClick(followedUser.username)}
                >
                  <img
                    className="w-10 h-10 rounded-full bg-neutral-800 object-cover border border-neutral-800"
                    src={followedUser.profilePic}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-row justify-start items-center relative">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleProfileClick(followedUser.username)}
                    >
                      <p className="text-white font-medium line-clamp-1 flex items-center hover:underline">
                        {followedUser.username}
                        {followedUser.isVerified && (
                          <span className="pl-1 pt-0.5 inline-flex items-center">
                            <Icons.verified />
                          </span>
                        )}
                      </p>
                      <p className="text-neutral-500">{followedUser.name}</p>
                    </div>

                    {userAuth?.username === followedUser.username ? (
                      ""
                    ) : (
                      <div className="absolute right-0 flex items-center justify-center bg-neutral-800 rounded-xl font-medium h-10 w-26">
                        <FollowButton
                          username={followedUser.username}
                          currentUserFollowing={
                            userAuth?.following || followedUser.following
                          }
                          isPrivate={followedUser.isPrivate}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-neutral-400">
            {username} is not following anyone yet.
          </div>
        )}
      </div>
    );
  };

  const routes = [
    <div className="flex flex-col items-center">
      <span className="font-medium">Followers</span>
      <span className="text-sm">{followers.length}</span>
    </div>,
    <div className="flex flex-col items-center">
      <span className="font-medium">Following</span>
      <span className="text-sm">{following.length}</span>
    </div>,
  ];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-neutral-950 text-white border border-neutral-800 rounded-2xl max-w-lg w-full ml-4 mr-4 mx-auto pb-2 outline-none"
      overlayClassName="fixed inset-0 bg-black/80 flex items-center justify-center"
    >
      <div className="relative flex flex-col max-h-[70vh] h-full">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div>
            <InPageNavigation
              routes={routes}
              defaultActiveIndex={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mt-4">
            {activeTab === 0 && renderFollowersTab()}
            {activeTab === 1 && renderFollowingTab()}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FollowersModal;
