import React, { useContext, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icons } from "./icons";
import { UserContext } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Navigation({ layoutContext }) {
  const location = useLocation();
  const path = location.pathname;
  const { userAuth, unreadNotificationCount, setUnreadNotificationCount } =
    useContext(UserContext);
  const navigate = useNavigate();

  const openCreateModal =
    layoutContext?.openCreateModal ||
    (() => {
      console.warn(
        "openCreateModal function not provided to Navigation component"
      );
    });

  const refetchPosts =
    layoutContext?.refetchPosts ||
    (() => {
      console.warn(
        "refetchPosts function not provided to Navigation component"
      );
    });

  const handleHomeClick = (e) => {
    e.preventDefault();
    if (path !== "/") {
      navigate("/");
    }
    refetchPosts();
    window.scrollTo(0, 0);
  };

  const handleActivityClick = (e) => {
    e.preventDefault();
    if (path !== "/activity") {
      navigate("/activity");
    }
  };

  useEffect(() => {
    if (!userAuth?.token) return;

    const pollNotifications = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/notification/notifications`,
          {
            headers: { Authorization: `Bearer ${userAuth.token}` },
            params: { limit: 1 },
          }
        );
        const unreadCount = response.data.notifications.filter(
          (n) => !n.isRead
        ).length;
        setUnreadNotificationCount(unreadCount);
      } catch (error) {
        console.error("Error polling notifications:", error);
      }
    };

    pollNotifications();
    const intervalId = setInterval(pollNotifications, 30000);

    return () => clearInterval(intervalId);
  }, [userAuth, setUnreadNotificationCount]);

  return (
    <>
      <Link
        to="/"
        onClick={handleHomeClick}
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.home
          className="h-[26px] w-[26px] text-lg"
          strokeColor={path === "/" ? "white" : "#4d4d4d"}
          fill={path === "/" ? "White" : "transparent"}
        />
      </Link>

      <Link
        to="/search"
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.search
          className="h-6 w-6 text-lg"
          strokeColor={path === "/search" ? "white" : "#4d4d4d"}
        />
      </Link>

      <button
        onClick={openCreateModal}
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.create
          className="h-6 w-6 text-lg"
          strokeColor={path === "/create" ? "white" : "#4d4d4d"}
          fill={path === "/create" ? "White" : "transparent"}
        />
      </button>

      <Link
        to="/activity"
        onClick={handleActivityClick}
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        {unreadNotificationCount > 0 ? (
          <Icons.unread
            className="h-[28px] w-[28px] text-lg"
            strokeColor={path === "/activity" ? "white" : "#4d4d4d"}
            fill={path === "/activity" ? "white" : "transparent"}
          />
        ) : (
          <Icons.activity
            className="h-[26px] w-[26px] text-lg"
            strokeColor={path === "/activity" ? "white" : "#4d4d4d"}
            fill={path === "/activity" ? "white" : "transparent"}
          />
        )}
      </Link>

      <Link
        to={`/${userAuth?.username || "profile"}`}
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.profile
          className="h-[26px] w-[26px] text-lg"
          strokeColor={
            path.match(new RegExp(`^/${userAuth?.username || "profile"}$`))
              ? "white"
              : "#4d4d4d"
          }
          fill={
            path.match(new RegExp(`^/${userAuth?.username || "profile"}$`))
              ? "white"
              : "transparent"
          }
        />
      </Link>

      <Link
        to="/chat"
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        {path === "/chat" ? <Icons.chat2 className="h-7 w-7 text-lg" /> : <Icons.chat className="h-7 w-7 text-lg" />}
        
      </Link>
    </>
  );
}
