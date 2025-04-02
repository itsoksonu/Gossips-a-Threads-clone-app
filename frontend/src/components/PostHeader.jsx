import React, { useContext } from "react";
import { Icons } from "./icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { UserContext } from "../contexts/UserContext";

const formatCreatedAt = (createdAt) => {
  const postDate = new Date(createdAt);
  const now = new Date();

  const diffInSeconds = Math.floor((now - postDate) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays <= 7) {
    return `${diffInDays}d`;
  }

  return postDate.toLocaleDateString("en-IN");
};

const PostHeader = ({
  author,
  createdAt,
  handleProfileClick,
  handleIconClick,
  hideActions = false,
  isSaved,
  isSaving,
}) => {
  const {
    userAuth: { username },
  } = useContext(UserContext);

  return (
    <div className="flex flex-row justify-start items-center relative">
      <div onClick={handleProfileClick} className="cursor-pointer flex items-center">
        <p className="text-white font-medium line-clamp-1 flex items-center hover:underline">
          {author.username}
        </p>
      </div>
      {author.isVerified && (
        <span className="pl-1 pt-0.5 inline-flex items-center">
          <Icons.verified />
        </span>
      )}
      <p className="min-w-fit text-neutral-500 ml-2 flex items-center">
        {formatCreatedAt(createdAt)}
      </p>

      {!hideActions && (
        <div className="absolute right-0 flex items-center h-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full hover:bg-neutral-800 transform transition-all duration-150 ease-out cursor-pointer"
              >
                <Icons.more2 />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="shadow-xl bg-[#181818] z-[999] rounded-2xl w-[250px] mt-1 p-0 border border-neutral-700"
            >
              {author.username === username ? (
                <>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "save")}
                    disabled={isSaving}
                    className="flex justify-between items-center cursor-pointer p-3 mx-2 tracking-normal select-none font-semibold mt-2 text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>{isSaved ? "Unsave" : "Save"}</span>
                    {isSaved ? <Icons.unsave /> : <Icons.save />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "hide-count")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Hide like and share counts</span>
                    <Icons.hidelike />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "reply-privacy")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Who can reply & quote</span>
                    <Icons.chevronRight />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "delete")}
                    className="flex justify-between items-center text-red-500 p-3 mx-2 tracking-normal select-none font-semibold m-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Delete</span>
                    <Icons.delete />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "copy-link")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold m-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Copy link</span>
                    <Icons.copy />
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "add-to-feed")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold m-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Add to feed</span>
                    <Icons.chevronRight />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "save")}
                    disabled={isSaving}
                    className="flex justify-between items-center cursor-pointer p-3 mx-2 tracking-normal select-none font-semibold mt-2 text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>{isSaved ? "Unsave" : "Save"}</span>
                    {isSaved ? <Icons.unsave /> : <Icons.save />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "not-interested")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Not interested</span>
                    <Icons.notinterested />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "mute")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] mt-2 active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Mute</span>
                    <Icons.mute />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "block")}
                    className="flex justify-between items-center text-red-500 p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Block</span>
                    <Icons.block />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "report")}
                    className="flex justify-between items-center text-red-500 p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950 hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Report</span>
                    <Icons.report />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleIconClick(e, "copy-link")}
                    className="flex justify-between items-center p-3 mx-2 tracking-normal select-none font-semibold m-2 cursor-pointer text-[15px] active:bg-neutral-950 text-white hover:bg-neutral-800 hover:rounded-xl outline-none"
                  >
                    <span>Copy link</span>
                    <Icons.copy />
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default PostHeader;