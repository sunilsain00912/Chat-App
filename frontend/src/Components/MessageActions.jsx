import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaEllipsisV, FaTrash, FaCopy, FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useChatStore } from "../store/chatStore";
import Portal from "../utils/Portal";

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const MessageActions = ({
  message,
  theme,
  isUserMessage,
  isMobile,
  onReact, // added for desktop reaction toggle
}) => {
  const { addReaction, deleteMessage } = useChatStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // popup position logic
  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const offsetX = isUserMessage ? -160 : 0;
      const offsetY = 26;
      setMenuPosition({
        top: rect.bottom + offsetY,
        left: Math.min(window.innerWidth - 180, rect.left + offsetX),
      });
    }
  }, [menuOpen, isUserMessage]);

  // close on outside click / ESC
  useEffect(() => {
    const handleClick = (e) => {
      if (!buttonRef.current?.contains(e.target)) {
        setMenuOpen(false);
        setShowEmojiPicker(false);
      }
    };
    const handleEsc = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // handle reaction
  const handleReaction = (emojiData) => {
    const emoji = emojiData?.emoji || emojiData;
    if (!emoji) return;
    addReaction(message._id, emoji);
    setShowEmojiPicker(false);
    setMenuOpen(false);
  };

  // copy text
  const handleCopy = async () => {
    if (message?.content) {
      await navigator.clipboard.writeText(message.content);
    }
    setMenuOpen(false);
  };

  // delete message
  const handleDelete = async () => {
    await deleteMessage(message._id);
    setMenuOpen(false);
  };

  // hide menu on mobile
  if (isMobile) return null;

  return (
    <div
      className={`absolute ${
        isUserMessage ? "right-1" : "left-1"
      } top-1 z-40 flex items-center`}
    >
      {/* ⋮ Menu Button */}
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((p) => !p);
          setShowEmojiPicker(false);
        }}
        className={`p-1 rounded-full focus:outline-none ${
          theme === "dark"
            ? "text-gray-300 hover:bg-gray-700/60"
            : "text-gray-600 hover:bg-gray-200"
        } transition`}
      >
        <FaEllipsisV className="text-[13px]" />
      </motion.button>

      {/* Popup Menu */}
      <AnimatePresence>
        {menuOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                zIndex: 9999,
              }}
              className={`w-44 rounded-lg border shadow-md overflow-hidden ${
                theme === "dark"
                  ? "bg-[#2a2f32] border-[#3a3f43] text-gray-200"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            >
              {/* Reaction Row */}
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 dark:border-[#3a3f43]">
                <div className="flex gap-1 flex-wrap">
                  {quickReactions.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReaction(emoji)}
                      className="text-[18px] leading-none"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
                <button
                  onClick={() => setShowEmojiPicker((p) => !p)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <FaRegSmile className="text-[16px] opacity-80" />
                </button>
              </div>

              {/* Copy */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm w-full transition"
              >
                <FaCopy className="opacity-80" /> Copy
              </button>

              {/* Reaction Bar toggle */}
              <button
                onClick={() => {
                  onReact?.();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm w-full transition"
              >
                <FaRegSmile className="opacity-80" /> Reactions
              </button>

              {/* Delete (only for sender) */}
              {isUserMessage && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 text-sm w-full transition"
                >
                  <FaTrash className="opacity-80" /> Delete
                </button>
              )}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className={`fixed z-[9999] ${
                isUserMessage ? "right-14" : "left-14"
              } top-[65%]`}
            >
              <div
                className={`rounded-lg overflow-hidden border ${
                  theme === "dark"
                    ? "border-[#3a3f43] bg-[#2a2f32]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <EmojiPicker
                  onEmojiClick={handleReaction}
                  theme={theme === "dark" ? "dark" : "light"}
                  width={300}
                  height={350}
                />
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageActions;
