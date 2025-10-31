import React, { useEffect, useState } from "react";
import useLayoutStore from "../store/layoutStore";
import { useLocation } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "../pages/chatSection/ChatWindow";

const Layout = ({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreviewOpen,
  statusPerviewContent,
}) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden flex ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Sidebar (hide on mobile) */}
      {!isMobile && <Sidebar />}

      <div className={`flex-1 flex min-h-0 ${isMobile ? "flex-col" : ""}`}>
    <div className={`flex-1 flex min-h-0 ${isMobile ? "flex-col" : ""}`}>
  {/* Chat List */}
  <motion.div
    key="chatlist"
    initial={false}
    animate={{ x: (!selectedContact && isMobile) ? 0 : (isMobile ? "-100%" : 0) }}
    transition={{ type: "tween", duration: 0.25 }}
    className={`w-full md:w-2/5 flex flex-col min-h-0 border-r border-gray-700 ${
      isMobile && selectedContact ? "hidden" : "flex"
    }`}
  >
    <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
  </motion.div>

  {/* Chat Window */}
  <motion.div
    key="chatWindow"
    initial={false}
    animate={{ x: (selectedContact || !isMobile) ? 0 : (isMobile ? "100%" : 0) }}
    transition={{ type: "tween", duration: 0.25 }}
    className={`flex-1 flex flex-col min-h-0 ${
      isMobile && !selectedContact ? "hidden" : "flex"
    }`}
  >
    <ChatWindow
      selectedContact={selectedContact}
      setSelectedContact={setSelectedContact}
      isMobile={isMobile}
    />
  </motion.div>
</div>

      </div>

      {/* ✅ Sidebar below on mobile */}
      {isMobile && <Sidebar />}

      {/* ✅ Theme dialog */}
      {isThemeDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div
            className={`${
              theme === "dark"
                ? "bg-[#202c33] text-white"
                : "bg-white text-black"
            } p-6 rounded-lg shadow-lg max-w-sm w-full`}
          >
            <h2 className="text-2xl font-semibold mb-4">Choose a theme</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                  className="form-radio text-blue-600"
                />
                <span>Light</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                  className="form-radio text-blue-600"
                />
                <span>Dark</span>
              </label>
            </div>

            <button
              onClick={toggleThemeDialog}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-150"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ✅ Status Preview */}
      {isStatusPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {statusPerviewContent}
        </div>
      )}
    </div>
  );
};

export default Layout;
