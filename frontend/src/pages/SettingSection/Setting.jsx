import React, { useState } from "react";
import { motion } from "framer-motion";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { logoutUser } from "../../Services/user.service";
import { toast } from "react-toastify";
import {
  FaMoon,
  FaSun,
  FaBell,
  FaBellSlash,
  FaLock,
  FaGlobe,
  FaSignOutAlt,
  FaRedo,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const Settings = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, clearUser } = useUserStore();

  const [notifications, setNotifications] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [language, setLanguage] = useState("en");

  const navigate = useNavigate();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleNotifications = () => setNotifications((p) => !p);
  const togglePrivacy = () => {
    setIsPrivate((p) => !p);
    toast.info(`Account set to ${!isPrivate ? "Private" : "Public"} mode`);
  };
  const handleLanguageChange = (e) => setLanguage(e.target.value);
  const handleResetSettings = () => {
    setNotifications(true);
    setIsPrivate(false);
    setLanguage("en");
    toast.info("Settings reset to default");
  };
  const handleLogout = async () => {
  try {
    await logoutUser();

    clearUser();
    localStorage.removeItem("user-storage");
    sessionStorage.clear();

    toast.success("Logged out successfully!");
    navigate("/user-login", { replace: true });

    // Force a reload to clear any cached user state
    setTimeout(() => window.location.reload(), 300);
  } catch (err) {
    toast.error("Logout failed, try again.");
  }
};


  return (
    <div
      className={`min-h-screen flex flex-col items-center px-4 py-8 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#0b141a] text-white"
          : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* 🔙 Top Bar */}
      <div className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 backdrop-blur-md bg-black/30">
        <button
          onClick={() => navigate(-1)}
          className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"
        >
          <FaArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">Settings</h1>
        <div className="w-6" /> {/* spacer */}
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`mt-20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md ${
          theme === "dark"
            ? "bg-[#202c33]/90 border border-gray-700"
            : "bg-white/90 border border-gray-200"
        }`}
      >
        <div className="divide-y divide-gray-300/30 dark:divide-gray-700/40">
          {/* 🌗 Theme */}
          <SettingRow
            icon={theme === "dark" ? <FaMoon /> : <FaSun />}
            label="Dark Mode"
            toggle={true}
            value={theme === "dark"}
            onToggle={toggleTheme}
          />

          {/* 🔔 Notifications */}
          <SettingRow
            icon={notifications ? <FaBell /> : <FaBellSlash />}
            label="Notifications"
            toggle={true}
            value={notifications}
            onToggle={toggleNotifications}
          />

          {/* 🔒 Privacy */}
          <SettingRow
            icon={<FaLock />}
            label="Private Account"
            toggle={true}
            value={isPrivate}
            onToggle={togglePrivacy}
          />

          {/* 🌐 Language */}
          <SettingSelect
            icon={<FaGlobe />}
            label="Language"
            value={language}
            onChange={handleLanguageChange}
            theme={theme}
          />

          {/* 🔁 Reset */}
          <div className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-3">
              <FaRedo className="text-blue-500" />
              <span>Reset Settings</span>
            </div>
            <button
              onClick={handleResetSettings}
              className="text-blue-500 hover:underline text-sm"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 🚪 Logout */}
        <div className="p-6 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-md"
          >
            <FaSignOutAlt /> Logout
          </motion.button>
        </div>

        {/* 👤 Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 pb-4">
          Logged in as{" "}
          <span className="font-medium">{user?.username || "Guest"}</span>
        </p>
      </motion.div>
    </div>
  );
};

// ✅ Reusable Components

const SettingRow = ({ icon, label, toggle, value, onToggle }) => (
  <div className="flex items-center justify-between py-4 px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {toggle && (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className={`w-12 h-6 flex items-center rounded-full transition-all ${
          value ? "bg-green-500 justify-end" : "bg-gray-400 justify-start"
        }`}
      >
        <div className="w-5 h-5 bg-white rounded-full shadow" />
      </motion.button>
    )}
  </div>
);

const SettingSelect = ({ icon, label, value, onChange, theme }) => (
  <div className="flex items-center justify-between py-4 px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    <select
      value={value}
      onChange={onChange}
      className={`px-2 py-1 rounded-lg border text-sm outline-none ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700 text-white"
          : "bg-gray-100 border-gray-300 text-gray-900"
      }`}
    >
      <option value="en">English</option>
      <option value="hi">Hindi</option>
      <option value="es">Spanish</option>
      <option value="fr">French</option>
    </select>
  </div>
);

export default Settings;
