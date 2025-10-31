import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/user-login/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ProtectedRoute, PublicRoute } from "./ProtectedRoute";
import HomePage from "./Components/HomePage";
import UserDetails from "./Components/UserDetails";
import Status from "./pages/StatusSection/Status";
import Setting from "./pages/SettingSection/Setting";
import ErrorBoundary from "./utils/ErrorBoundary";
import useUserStore from "./store/useUserStore";
import {
  disconnectSocket,
  initializeSocket,
  getSocket,
} from "./Services/chat.service";
import { useChatStore } from "./store/chatStore";
import { subscribeToPush } from "./utils/subscribeToPush";
import ProfileAbout from "./Components/profile/ProfileAboutt";

/* 🔹 New Component: Handles chat redirect logic */
const ChatRedirectHandler = () => {
  const navigate = useNavigate();
  const { setCurrentConversation } = useChatStore();

  useEffect(() => {
    const pathname = window.location.pathname;
    // Agar user /chat/... route me hai (refresh or reopen case)
    if (pathname.startsWith("/chat/")) {
      navigate("/"); // redirect to home
      setCurrentConversation(null); // reset current chat
    }
  }, [navigate, setCurrentConversation]);

  return null;
};

function App() {
  const { user } = useUserStore();
  const { setCurrentUser, initSocketListeners, cleanup } = useChatStore();

  useEffect(() => {
    if (!user?._id) return;

    (async () => {
      setCurrentUser(user);

      const socket = initializeSocket();

      socket.on("connect", () => {
        socket.emit("user_connected", user._id);
        initSocketListeners(); // ✅ initialize listeners
      });

      socket.on("disconnect", (reason) => {
        console.warn("⚠️ [App] Socket disconnected:", reason);
      });

      socket.on("connect_error", (err) => {
        console.error("❌ [App] Socket connection error:", err.message);
      });

      // 🆕 Register push notifications
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          await subscribeToPush();
        } catch (err) {
          console.error("❌ [Push] Subscription failed:", err);
        }
      }

      // Debug
      setTimeout(() => {
        const s = getSocket();
      }, 2000);
    })();

    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer
        position="bottom-center"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        toastClassName="rounded-lg shadow-md font-medium"
        bodyClassName="text-sm"
      />

      <ErrorBoundary>
        <Router>
          {/* 🔹 Chat redirect logic mounted globally */}
          <ChatRedirectHandler />

          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/user-login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/user-profile" element={<UserDetails />} />
              <Route path="/status" element={<Status />} />
              <Route path="/setting" element={<Setting />} />
              <Route path="/profile/:userId" element={<ProfileAbout />} />
            </Route>
          </Routes>
        </Router>
      </ErrorBoundary>
    </>
  );
}

export default App;
