import React from "react";
import { useNavigate } from "react-router";

const NotFoundPage = () => {

    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/');
    }
  
    return (
    <div className=" h-screen flex flex-col items-center justify-center">
      <p className="font-medium">Sorry, this page isn't available</p>
      <p className="text-neutral-500 pt-2 text-center">
        The link that you followed may be broken <br /> or the page may have
        been removed.
      </p>
      <button
        className="p-1 px-4 bg-white text-black rounded-md mt-4 font-medium cursor-pointer hover:bg-white/90"
        onClick={handleClick}
      >
        Back
      </button>
    </div>
  );
};

export default NotFoundPage;
