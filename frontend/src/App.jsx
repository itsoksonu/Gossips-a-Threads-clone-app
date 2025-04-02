import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { UserContext } from "./contexts/UserContext";
import { lookInSession, removeFromSession, storeInSession } from "./common/Session";
import UserAuthForm from "./pages/UserAuthForm";
import Home from "./pages/Home";
import ProfileSetup from "./pages/ProfileSetup";
import ProtectedRoute from "./common/ProtectedRoute";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./pages/SearchPage";
import ActivityPage from "./pages/ActivityPage";
import FollowRequests from "./components/FollowRequests";
import { FollowProvider } from './contexts/FollowContext.jsx';
import PostPage from "./pages/PostPage.jsx";
import SavedPostsPage from "./pages/SavedPostsPage.jsx";

function App() {
  const [userAuth, setUserAuth] = useState({ token: null, savedPosts: [] });

  useEffect(() => {
    const userInSession = lookInSession("user");

    if (userInSession) {
      try {
        setUserAuth(JSON.parse(userInSession));
      } catch (error) {
        console.error("Failed to parse user data from session:", error);
        setUserAuth({ token: null });
      }
    }
  }, []);

  useEffect(() => {
    if (userAuth && userAuth.token) {
      storeInSession("user", userAuth);
    } else {
      removeFromSession("user");
    }
  }, [userAuth]);

  return (
    <UserContext.Provider value={{ userAuth, setUserAuth }}>
      <FollowProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute> <Home /> </ProtectedRoute>} />
          <Route path="signup" element={<UserAuthForm type="signup" />} />
          <Route path="login" element={<UserAuthForm type="login" />} />
          <Route path=":profileId" element={<ProfilePage/>} />
          <Route path="/:username/post/:Postid" element={<ProtectedRoute> <PostPage /> </ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/followrequests" element={<ProtectedRoute><FollowRequests /></ProtectedRoute>} />
          <Route path="/profile-setup" element={ <ProtectedRoute> <ProfileSetup /> </ProtectedRoute> } />
          <Route path="/saved" element={<ProtectedRoute><SavedPostsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </FollowProvider>
    </UserContext.Provider>
  );
}

export default App;