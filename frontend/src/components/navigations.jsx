import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icons } from "./icons";
import { UserContext } from "../contexts/UserContext";

export default function Navigation({ layoutContext }) {
  const location = useLocation();
  const path = location.pathname;
  const { userAuth } = useContext(UserContext);
  
  const openCreateModal = layoutContext?.openCreateModal || (() => {
    console.warn("openCreateModal function not provided to Navigation component");
  });

  return (
    <>
      <Link
        to="/"
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

      {/* Changed from Link to button to open modal instead of navigation */}
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
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.activity
          className="h-[26px] w-[26px] text-lg"
          strokeColor={path === "/activity" ? "white" : "#4d4d4d"}
          fill={path === "/activity" ? "white" : "transparent"}
        />
      </Link>

      <Link
        to={`/${userAuth?.username || 'profile'}`}
        className="hover:bg-zinc-800 p-4 sm:py-5 sm:px-8 rounded-lg transform transition-all duration-150 ease-out hover:scale-100 active:scale-90 flex items-center justify-center w-full"
      >
        <Icons.profile
          className="h-[26px] w-[26px] text-lg"
          strokeColor={
            path.match(new RegExp(`^/${userAuth?.username || 'profile'}$`))
              ? "white"
              : "#4d4d4d"
          }
          fill={
            path.match(new RegExp(`^/${userAuth?.username || 'profile'}$`))
              ? "white"
              : "transparent"
          }
        />
      </Link>
    </>
  );
}