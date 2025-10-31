import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/layoutStore";
import { FaComments, FaUserCircle, FaCog } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";
import { motion } from "framer-motion";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle active tab
  useEffect(() => {
    switch (location.pathname) {
      case "/":
        setActiveTab("chats");
        break;
      case "/status":
        setActiveTab("status");
        break;
      case "/user-profile":
        setActiveTab("profile");
        break;
      case "/setting":
        setActiveTab("setting");
        break;
      default:
        break;
    }
  }, [location, setActiveTab]);

  // Hide sidebar when chat open on mobile
  if (isMobile && selectedContact) return null;

  // Theme-based styles
  const activeBg = theme === "dark" ? "bg-emerald-600" : "bg-emerald-100";
  const hoverBg = theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100";
  const activeColor = theme === "dark" ? "text-white" : "text-emerald-700";
  const inactiveColor = theme === "dark" ? "text-gray-400" : "text-gray-700";

  const IconWrapper = ({ to, tab, children }) => (
    <Link
      to={to}
      className="focus:outline-none flex items-center justify-center"
    >
      <motion.div
        animate={{ scale: activeTab === tab ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 18 }}
        className={`p-3 rounded-2xl ${
          activeTab === tab ? activeBg : hoverBg
        } transition-all duration-200`}
      >
        {children}
      </motion.div>
    </Link>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 20 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 w-full h-16 flex flex-row justify-evenly items-center"
          : "w-20 h-screen flex flex-col justify-between items-center border-r"
      } ${
        theme === "dark"
          ? "bg-gray-900 border-gray-700"
          : "bg-gray-50 border-gray-200"
      } shadow-md z-50`}
    >
      {isMobile ? (
        // ✅ Mobile Bottom Bar
        <>
          <IconWrapper to="/" tab="chats">
            <FaComments
              className={`h-6 w-6 ${
                activeTab === "chats" ? activeColor : inactiveColor
              }`}
            />
          </IconWrapper>

          <IconWrapper to="/status" tab="status">
            <MdRadioButtonChecked
              className={`h-6 w-6 ${
                activeTab === "status" ? activeColor : inactiveColor
              }`}
            />
          </IconWrapper>

          <IconWrapper to="/user-profile" tab="profile">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="user"
                className={`h-8 w-8 rounded-full object-cover border-2 ${
                  activeTab === "profile"
                    ? "border-emerald-400"
                    : "border-transparent"
                }`}
              />
            ) : (
              <FaUserCircle
                className={`h-6 w-6 ${
                  activeTab === "profile" ? activeColor : inactiveColor
                }`}
              />
            )}
          </IconWrapper>

          <IconWrapper to="/setting" tab="setting">
            <FaCog
              className={`h-6 w-6 ${
                activeTab === "setting" ? activeColor : inactiveColor
              }`}
            />
          </IconWrapper>
        </>
      ) : (
        // ✅ Desktop Sidebar
        <>
          <div className="flex flex-col items-center space-y-6 mt-4">
            <IconWrapper to="/" tab="chats">
              <FaComments
                className={`h-6 w-6 ${
                  activeTab === "chats" ? activeColor : inactiveColor
                }`}
              />
            </IconWrapper>

            <IconWrapper to="/status" tab="status">
              <MdRadioButtonChecked
                className={`h-6 w-6 ${
                  activeTab === "status" ? activeColor : inactiveColor
                }`}
              />
            </IconWrapper>
          </div>

          <div className="flex flex-col items-center space-y-6 mb-4">
            <IconWrapper to="/user-profile" tab="profile">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="user"
                  className={`h-9 w-9 rounded-full object-cover border-2 ${
                    activeTab === "profile"
                      ? "border-emerald-400"
                      : "border-transparent"
                  }`}
                />
              ) : (
                <FaUserCircle
                  className={`h-7 w-7 ${
                    activeTab === "profile" ? activeColor : inactiveColor
                  }`}
                />
              )}
            </IconWrapper>

            <IconWrapper to="/setting" tab="setting">
              <FaCog
                className={`h-6 w-6 ${
                  activeTab === "setting" ? activeColor : inactiveColor
                }`}
              />
            </IconWrapper>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Sidebar;
