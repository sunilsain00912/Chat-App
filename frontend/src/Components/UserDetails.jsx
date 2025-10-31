import React, { useState } from "react";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/themeStore";
import { updateUserProfile } from "../Services/user.service";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera } from "react-icons/fa";

const UserDetails = () => {
  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [profilePicture, setProfilePicture] = useState(
    user?.profilePicture || ""
  );
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProfilePicture(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("username", username);
      formData.append("about", about);
      formData.append("agreed", true);
      if (file) formData.append("media", file);

      const res = await updateUserProfile(formData);
      if (res.status === "success") {
        setUser(res.data);
        toast.success("Profile updated successfully!");
        navigate(-1);
      } else {
        toast.error(res.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Error updating profile.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-6 relative transition-all duration-300 ${
        theme === "dark"
          ? "bg-[#0B141A] text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md shadow-md transition-all duration-300"
      >
        <FaArrowLeft size={18} />
      </button>

      {/* 🧩 Card */}
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl p-8 border transition-all duration-500 ${
          theme === "dark"
            ? "bg-[#1F2C34]/70 border-gray-700 backdrop-blur-xl"
            : "bg-white/80 border-gray-200 backdrop-blur-xl"
        }`}
      >
        <h2 className="text-2xl font-semibold text-center mb-8">
          Edit Your Profile
        </h2>

        {/* 🖼️ Profile Picture */}
        <div className="relative flex flex-col items-center mb-8 group">
          <img
            src={
              profilePicture ||
              `https://ui-avatars.com/api/?name=${username || "User"}`
            }
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-lg"
          />
          <label
            htmlFor="profileUpload"
            className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-md cursor-pointer transition-all duration-300 opacity-90 group-hover:opacity-100"
          >
            <FaCamera size={14} />
          </label>
          <input
            id="profileUpload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* ✏️ Username */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border outline-none focus:ring-2 transition-all ${
              theme === "dark"
                ? "bg-[#2A3942] border-gray-700 text-white focus:ring-green-600"
                : "bg-gray-100 border-gray-300 text-gray-900 focus:ring-green-500"
            }`}
            placeholder="Enter your name"
          />
        </div>

        {/* 🗒️ About */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-gray-300">
            About
          </label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows="3"
            className={`w-full px-4 py-2 rounded-lg border resize-none outline-none focus:ring-2 transition-all ${
              theme === "dark"
                ? "bg-[#2A3942] border-gray-700 text-white focus:ring-green-600"
                : "bg-gray-100 border-gray-300 text-gray-900 focus:ring-green-500"
            }`}
            placeholder="Tell something about yourself..."
          ></textarea>
        </div>

        {/* 💾 Save Button */}
        <button
          onClick={handleSave}
          disabled={uploading}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
            uploading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
          } text-white shadow-lg`}
        >
          {uploading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default UserDetails;
