import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import { useFollow } from "../contexts/FollowContext.jsx";
import { Icons } from './icons';

const FollowButton = ({ username, currentUserFollowing, isPrivate, onFollowStatusChange }) => {
  const [followState, setFollowState] = useState({
    isFollowing: false,
    isPending: false,
    canFollowBack: false,
    isLoading: false,
  });
  const { userAuth } = useContext(UserContext);
  const { followUpdates, handleFollowUpdate } = useFollow();
  const apiUrl = import.meta.env.VITE_SERVER;

  const getInitialFollowState = () => {
    const isFollowingFromProps = Array.isArray(currentUserFollowing) && 
      currentUserFollowing.some(user => 
        (typeof user === 'object' && user?.username === username) || user === username
      );

    const storedAuth = JSON.parse(sessionStorage.getItem('userAuth')) || {};
    const storedFollowing = Array.isArray(storedAuth.following) ? storedAuth.following : [];
    const isFollowingFromStorage = storedFollowing.some(user => 
      (typeof user === 'object' && user?.username === username) || user === username
    );

    return isFollowingFromProps || isFollowingFromStorage;
  };

  const refreshFollowStatus = useCallback(async () => {
    if (!username || !userAuth?.token) return;

    try {
      const isFollowing = getInitialFollowState();
      setFollowState(prev => ({ ...prev, isFollowing }));

      if (!isFollowing) {
        const [pendingResponse, followBackResponse] = await Promise.all([
          axios.get(`${apiUrl}/user/pending-request/${username}`, {
            headers: { Authorization: `Bearer ${userAuth.token}` },
          }),
          axios.get(`${apiUrl}/user/is-following-me/${username}`, {
            headers: { Authorization: `Bearer ${userAuth.token}` },
          }),
        ]);

        setFollowState(prev => ({
          ...prev,
          isPending: pendingResponse.data.isPending,
          canFollowBack: followBackResponse.data.isFollowingMe && !isFollowing,
        }));
      } else {
        setFollowState(prev => ({ ...prev, isPending: false, canFollowBack: false }));
      }
    } catch (error) {
      console.error('Error refreshing follow status:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, username, userAuth?.token]);

  useEffect(() => {
    const lastUpdate = followUpdates[followUpdates.length - 1];
    if (lastUpdate && lastUpdate.username === username) {
      setFollowState(prev => ({
        ...prev,
        isFollowing: lastUpdate.action === 'follow' && !lastUpdate.isPending,
        isPending: lastUpdate.isPending || false,
        canFollowBack: false,
      }));
      if (lastUpdate.action === 'follow' && !lastUpdate.isPending) {
        axios.get(`${apiUrl}/user/is-following-me/${username}`, {
          headers: { Authorization: `Bearer ${userAuth.token}` },
        })
          .then(response => setFollowState(prev => ({
            ...prev,
            canFollowBack: response.data.isFollowingMe && !prev.isFollowing,
          })))
          .catch(error => console.error('Error checking follow-back:', error));
      }
    }
  }, [followUpdates, username, userAuth?.token, apiUrl]);

  useEffect(() => {
    refreshFollowStatus();
  }, [username, currentUserFollowing, userAuth?.token, refreshFollowStatus]);

  const handleFollowAction = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userAuth?.token) {
      console.error('User not authenticated');
      return;
    }

    setFollowState(prev => ({ ...prev, isLoading: true }));
    const headers = { Authorization: `Bearer ${userAuth.token}` };
    const { isFollowing, isPending } = followState;

    try {
      if (isFollowing) {
        await axios.post(`${apiUrl}/user/unfollow/${username}`, {}, { headers });
        setFollowState(prev => ({ ...prev, isFollowing: false }));
        handleFollowUpdate({ username, action: 'unfollow' });
      } else if (isPending) {
        await axios.delete(`${apiUrl}/user/follow-request/${username}`, { headers });
        setFollowState(prev => ({ ...prev, isPending: false }));
        handleFollowUpdate({ username, action: 'cancel-request', isPending: false });
      } else {
        await axios.post(`${apiUrl}/user/follow/${username}`, {}, { headers });
        if (isPrivate) {
          setFollowState(prev => ({ ...prev, isPending: true }));
          handleFollowUpdate({ username, action: 'follow', isPrivate: true, isPending: true });
        } else {
          setFollowState(prev => ({ ...prev, isFollowing: true }));
          handleFollowUpdate({ username, action: 'follow', isPrivate: false, isPending: false });
        }
      }

      sessionStorage.removeItem(`profile-${username}`);
      if (onFollowStatusChange) onFollowStatusChange();
    } catch (error) {
      console.error('Error with follow action:', error.response?.data || error.message);
      setFollowState(prev => ({ ...prev, isFollowing, isPending }));
    } finally {
      setFollowState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const { isFollowing, isPending, canFollowBack, isLoading } = followState;
  const buttonText = isLoading
    ? <Icons.spinner className="w-4 h-4 animate-spin text-center" />
    : isFollowing
    ? 'Following'
    : isPending
    ? 'Requested'
    : canFollowBack
    ? 'Follow Back'
    : 'Follow';

  const buttonClasses = `follow-button ${
    isFollowing ? 'following text-neutral-500 font-medium' : 
    isPending ? 'pending' : 
    canFollowBack ? 'follow-back' : ''
  } cursor-pointer disabled:opacity-50`;

  return (
    <button
      onClick={handleFollowAction}
      disabled={isLoading}
      className={buttonClasses}
    >
      {buttonText}
    </button>
  );
};

export default FollowButton;
