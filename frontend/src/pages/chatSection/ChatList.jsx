import React, { useMemo, useState } from "react";
import useLayoutStore from "../../store/layoutStore";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaPlus, FaDownload, FaTimes } from "react-icons/fa";
import { useChatStore } from "../../store/chatStore";

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const rawConversations = useChatStore((state) => state.conversations);

  const conversations = useMemo(() => {
    if (Array.isArray(rawConversations)) return rawConversations;
    return rawConversations?.data || [];
  }, [rawConversations]);

  const [searchTerm, setSearchTerm] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const filteredContacts = useMemo(
    () =>
      contacts?.filter((c) =>
        c?.username?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [contacts, searchTerm]
  );

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  const handleChatSelect = (contact) => {
    const chatStore = useChatStore.getState();
      chatStore.clearConversation();
    setSelectedContact(contact);
    chatStore.setCurrentConversation(contact.conversation);
    chatStore.markMessagesAsRead();
  };

  // 🔽 download image-handler
  const handleDownload = async (imageUrl) => {
    try {
      if (!imageUrl) return;

      // ✅ Handle Base64 or Data URLs
      if (imageUrl.startsWith("data:image")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = "profile-picture.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // ✅ Handle DiceBear or other SVG avatar URLs
      if (imageUrl.includes("dicebear") || imageUrl.endsWith(".svg")) {
        const response = await fetch(imageUrl);
        const text = await response.text();
        const blob = new Blob([text], { type: "image/svg+xml" });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "avatar.svg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      // ✅ Handle normal URLs (uploads or CDN)
      const url = imageUrl.startsWith("http")
        ? imageUrl
        : `${window.location.origin}${imageUrl}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "profile-picture.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading image:", err);
      alert("⚠️ Unable to download image. Try again or use desktop mode.");
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-full border-r backdrop-blur-xl transition-all duration-300 ${
        theme === "dark"
          ? "bg-[rgba(17,27,33,0.8)] border-gray-700 text-white"
          : "bg-[rgba(255,255,255,0.95)] border-gray-200 text-gray-900"
      }`}
    >
      {/* 🌟 HEADER */}
      <div
        className={`flex justify-between items-center px-5 py-4 sticky top-0 z-20 backdrop-blur-lg border-b ${
          theme === "dark"
            ? "bg-[rgba(32,44,51,0.6)] border-gray-700"
            : "bg-[rgba(245,247,250,0.7)] border-gray-200"
        }`}
      >
        <h2 className="text-lg font-semibold tracking-wide select-none">
          Messages
        </h2>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-full shadow-lg shadow-emerald-500/20 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gradient-to-r from-emerald-700 to-green-500"
              : "bg-gradient-to-r from-green-400 to-emerald-500"
          } text-white`}
        >
          <FaPlus size={13} />
        </motion.button>
      </div>

      {/* 🔍 SEARCH BAR */}
      <div className="p-3">
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 shadow-sm border transition-all duration-200 ${
            theme === "dark"
              ? "bg-[rgba(42,57,65,0.8)] border-gray-700 hover:border-emerald-600"
              : "bg-gray-100 border-gray-200 hover:border-emerald-400"
          } focus-within:ring-2 focus-within:ring-emerald-400`}
        >
          <FaSearch
            className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 bg-transparent outline-none text-sm tracking-wide ${
              theme === "dark" ? "text-gray-200" : "text-gray-800"
            }`}
          />
        </div>
      </div>

      {/* 💬 CHAT LIST */}
      <div className="flex-1 overflow-y-auto px-3 pb-5 space-y-2 custom-scrollbar">
        <AnimatePresence>
          {filteredContacts?.length > 0 ? (
            filteredContacts.map((contact, i) => {
              // ✅ conversation matching this contact
              const liveConv = conversations.find(
                (conv) => conv._id === contact?.conversation?._id
              );

              const lastMsg =
                liveConv?.lastMessage?.content ||
                contact?.conversation?.lastMessage?.content ||
                "Start a new conversation ✨";

              // ✅ unread detection
              const unread = liveConv?.unreadCount > 0;

              return (
                <motion.div
                  key={contact?._id || i}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleChatSelect(contact)}
                  whileHover={{ scale: 1.015 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border transition-all duration-200 ${
                    selectedContact?._id === contact?._id
                      ? theme === "dark"
                        ? "bg-[rgba(42,57,65,0.8)] border-emerald-600 shadow-lg shadow-emerald-600/20"
                        : "bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-200/40"
                      : theme === "dark"
                      ? "bg-[rgba(42,57,65,0.4)] border-transparent hover:border-gray-600 hover:bg-[rgba(42,57,65,0.6)]"
                      : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {/* 🖼️ Profile */}
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation(); // stop chat open
                      setPreviewImage(contact?.profilePicture);
                    }}
                  >
                    <motion.img
                      src={contact?.profilePicture || "/default-avatar.png"}
                      alt={contact?.username}
                      className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-transparent hover:border-emerald-400 transition-all duration-200"
                      whileHover={{ scale: 1.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const imageUrl =
                          contact?.profilePicture &&
                          contact.profilePicture.trim() !== ""
                            ? contact.profilePicture
                            : "/default-avatar.png"; // fallback always available
                        setPreviewImage(imageUrl);
                      }}
                    />
                    {onlineUsers.get(contact?._id)?.isOnline && (
                      <motion.span
                        layout
                        animate={{ scale: [0.9, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]"
                      />
                    )}
                  </div>

                  {/* 🗨️ Message Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-[2px]">
                      <h3
                        className={`font-semibold truncate text-[15px] ${
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        {contact?.username}
                      </h3>
                      <span
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatTimestamp(
                          liveConv?.lastMessage?.createdAt ||
                            contact?.conversation?.lastMessage?.createdAt
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p
                        className={`text-[13px] truncate max-w-[70%] ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {lastMsg}
                      </p>

                      {/* 🔔 Unread badge */}
                      {unread && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`ml-2 text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ${
                            theme === "dark"
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {liveConv?.unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col justify-center items-center h-full opacity-70 select-none"
            >
              <img
                src="/no-chats.svg"
                alt="No chats"
                className="w-32 h-32 opacity-50 mb-3"
              />
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No chats found. Start a new one 💬
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 🖼️ Profile Image Preview Popup */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Profile Image */}
              <img
                src={previewImage || "/default-avatar.png"}
                alt="Profile"
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl border border-gray-700 object-contain select-none"
              />

              {/* ❌ Close Button */}
              <button
                className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-full hover:bg-black transition active:scale-90"
                onClick={() => setPreviewImage(null)}
              >
                <FaTimes size={16} />
              </button>

              {/* ⬇️ Download Button */}
              <button
                className="absolute bottom-3 right-3 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow-lg active:scale-95"
                onClick={() => handleDownload(previewImage)}
              >
                <FaDownload size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatList;
