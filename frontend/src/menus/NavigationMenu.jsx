import React, { useContext } from "react";
import { Icons } from "../components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { removeFromSession } from "../common/Session";
import { UserContext } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";

export default function NavigationMenu() {
  const { setUserAuth } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogOut = () => {
    removeFromSession("user");
    setUserAuth({ access_token: null });
  };

  const handleSavedPosts = () => {
    navigate("/saved")
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div>
            <Icons.menu
              className="h-[22px] w-[22px] 
                   [stroke:#4d4d4d] 
                   hover:[stroke:#ffffff] 
                   active:[stroke:#ffffff] 
                   transform transition-all duration-150 ease-out 
                   hover:scale-100 active:scale-90 cursor-pointer"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="shadow-xl bg-[#181818] z-[999] rounded-2xl w-[220px] mt-1 p-0 border border-neutral-700"
        >
          <DropdownMenuItem className="p-3 mx-2 tracking-normal select-none font-semibold mt-2 cursor-pointer text-[15px] active:bg-neutral-950  text-white hover:bg-neutral-800 focus:rounded-xl outline-none">
            Switch appearance
          </DropdownMenuItem>

          <DropdownMenuItem className="p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950  text-white hover:bg-neutral-800 focus:rounded-xl outline-none">
          <button
              aria-label=" Saved posts"
              onClick={handleSavedPosts}
            >
               Saved posts
            </button>
          </DropdownMenuItem>

          <DropdownMenuItem className="p-3 mx-2 tracking-normal select-none font-semibold cursor-pointer text-[15px] active:bg-neutral-950  text-white hover:bg-neutral-800 hover:rounded-xl outline-none">
            About
          </DropdownMenuItem>

          <DropdownMenuItem className="p-3 mx-2 tracking-normal select-none font-semibold mb-2 cursor-pointer text-[15px] active:bg-neutral-950  text-white hover:bg-neutral-800 hover:rounded-xl outline-none">
            Report a problem
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[1.4px] my-0" />
          <DropdownMenuItem className="p-3 mx-2 tracking-normal select-none font-semibold my-2 cursor-pointer text-[15px] active:bg-neutral-950  hover:bg-neutral-800 hover:rounded-xl outline-none text-red-500">
            <button
              aria-label="Log out"
              className="cursor-pointer"
              onClick={handleLogOut}
            >
              Log out
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
