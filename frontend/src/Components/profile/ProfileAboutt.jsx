import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaEnvelope,
  FaPhoneAlt,
  FaInfoCircle,
  FaClock,
} from "react-icons/fa";
import { motion } from "framer-motion";
import useThemeStore from "../../store/themeStore";

const Loader = ({ progress = 0 }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 text-white z-50 overflow-hidden">
      <motion.div
        className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Icon with pulse */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 250,
          damping: 15,
        }}
        className="relative z-10 bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <FaEnvelope className="w-14 h-14 text-white drop-shadow-lg" />
        </motion.div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-56 bg-white/20 rounded-full h-2 mt-10 overflow-hidden">
        <motion.div
          className="bg-white h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* Progress text */}
      <motion.p
        key={progress}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 text-lg font-semibold tracking-wide text-white/90"
      >
        {progress < 100 ? `Loading ${progress}%...` : "Almost Ready!"}
      </motion.p>
    </div>
  );
};

// 🌿 Main ProfileAbout
const ProfileAbout = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // 🔄 Fake loading animation progress
  useEffect(() => {
    if (loading) {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.random() * 10;
        if (current >= 100) {
          clearInterval(interval);
          setProgress(100);
        } else setProgress(Math.min(current, 100));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // ⚙️ Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/chats/user/${userId}`,
          { withCredentials: true }
        );
        setUserData(res.data);
      } catch (err) {
        console.error("❌ Error fetching user details:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserDetails();
  }, [userId]);

  // 🌀 Show loader while loading
  if (loading) return <Loader progress={progress} />;

  if (!userData)
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "dark"
            ? "bg-gray-900 text-gray-300"
            : "bg-white text-gray-600"
        }`}
      >
        User not found
      </div>
    );

  return (
    <div
      className={`flex flex-col h-screen ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-br from-emerald-50 via-white to-emerald-100"
      }`}
    >
      {/* HEADER */}
      <div
        className={`w-full px-4 py-3 flex items-center shadow-lg sticky top-0 z-10 ${
          theme === "dark"
            ? "bg-gray-800 text-white"
            : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
        }`}
      >
        <FaArrowLeft
          className="cursor-pointer hover:scale-110 transition-transform mr-3"
          size={22}
          onClick={() => navigate(-1)}
        />
        <h1 className="text-lg sm:text-xl font-semibold">Contact Info</h1>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-400 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500">
        <div className="flex flex-col items-center px-5 sm:px-8 pb-10">
          {/* PROFILE SECTION */}
          <div className="relative w-full flex flex-col items-center mt-10">
            <div className="bg-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform duration-300">
              <img
                src={userData.profilePicture || "/default-avatar.png"}
                alt="Profile"
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-emerald-600 shadow-md"
              />
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold">
                {userData.username || "Unknown User"}
              </h2>
              <p
                className={`text-sm mt-2 ${
                  userData.isOnline ? "text-green-600" : "text-gray-500"
                }`}
              >
                {userData.isOnline ? "Online now" : "Offline"}
              </p>
            </div>
          </div>

          {/* INFO CARDS */}
          <div className="w-full max-w-lg mt-10 space-y-5">
            <InfoCard
              icon={<FaEnvelope className="text-emerald-600" />}
              label="Email"
              value={userData.email || "Not available"}
            />
            <InfoCard
              icon={<FaPhoneAlt className="text-emerald-600" />}
              label="Phone"
              value={userData.phoneNumber || "Not available"}
            />
            <InfoCard
              icon={<FaInfoCircle className="text-emerald-600" />}
              label="About"
              value={userData.about || "Hey there! I am using this app."}
            />
            <InfoCard
              icon={<FaClock className="text-emerald-600" />}
              label="Last Seen"
              value={
                userData.isOnline
                  ? "Currently Active"
                  : new Date(userData.lastSeen).toLocaleString()
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value }) => (
  <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-md p-4 sm:p-5 flex gap-4 items-center hover:shadow-lg hover:bg-white transition-all duration-300">
    <div className="text-2xl flex-shrink-0">{icon}</div>
    <div>
      <h3 className="text-sm text-gray-500 font-semibold uppercase tracking-wide">
        {label}
      </h3>
      <p className="text-gray-800 font-medium text-base sm:text-lg mt-1 break-words">
        {value}
      </p>
    </div>
  </div>
);

export default ProfileAbout;
