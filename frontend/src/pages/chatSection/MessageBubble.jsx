import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiPaperAirplane, HiInboxArrowDown, HiEye } from "react-icons/hi2";
import { FaTrash } from "react-icons/fa";
import { format, isValid } from "date-fns";
import MessageActions from "../../Components/MessageActions";
import { useChatStore } from "../../store/chatStore";

const LONG_PRESS_MS = 500;
const REACTION_OPTIONS = ["❤️", "😂", "👍", "🔥", "😢", "👏"];

const MessageBubble = ({ message, theme = "light", currentUser }) => {
  const { messages, addReaction, deleteMessage } = useChatStore();
  const elRef = useRef(null);
  const longPressTimer = useRef(null);

  const [showReactions, setShowReactions] = useState(false);
  const [selected, setSelected] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [status, setStatus] = useState(message?.messageStatus || "sent");

  const isUserMessage = message?.sender?._id === currentUser?._id;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (message?.messageStatus) setStatus(message.messageStatus);
  }, [message?.messageStatus]);

  const currentMessage = messages.find((m) => m._id === message._id);
  const reactions = currentMessage?.reactions || [];

  // Close all popups on outside click
  useEffect(() => {
    const closeAll = (e) => {
      if (!elRef.current?.contains(e.target)) {
        setIsHeaderVisible(false);
        setShowReactions(false);
        setSelected(false);
      }
    };
    document.addEventListener("click", closeAll);
    return () => document.removeEventListener("click", closeAll);
  }, []);

  const handleReaction = (emoji) => {
    addReaction(message._id, emoji);
    setShowReactions(false);
  };

  // Double tap ❤️
  const lastTap = useRef(0);
  const handlePointerUp = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) handleReaction("❤️");
    lastTap.current = now;
  };

  // Long press (mobile) — show delete header for sender only
  const startLongPress = (e) => {
    if (isMobile && e.type === "touchstart" && isUserMessage) {
      longPressTimer.current = setTimeout(() => {
        setSelected(true);
        setIsHeaderVisible(true);
      }, LONG_PRESS_MS);
    } else if (isMobile && e.type === "touchstart") {
      longPressTimer.current = setTimeout(() => {
        setShowReactions(true);
      }, LONG_PRESS_MS);
    }
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleDelete = async () => {
    if (!isUserMessage) return;
    await deleteMessage(message._id);
    setSelected(false);
    setIsHeaderVisible(false);
  };

  const groupedReactions = React.useMemo(() => {
    const map = reactions.reduce((acc, { emoji }) => {
      if (!acc[emoji]) acc[emoji] = { emoji, count: 0 };
      acc[emoji].count++;
      return acc;
    }, {});
    return Object.values(map);
  }, [reactions]);

  const formattedTime = React.useMemo(() => {
    const t = message?.createdAt;
    if (!t) return "";
    const d = new Date(t);
    return isValid(d) ? format(d, "HH:mm") : "";
  }, [message?.createdAt]);

  const renderStatus = useCallback(() => {
    if (!isUserMessage) return null;
    switch (status) {
      case "sent":
        return (
          <HiPaperAirplane
            size={13}
            className="text-blue-400 rotate-[-30deg]"
          />
        );
      case "delivered":
        return <HiInboxArrowDown size={13} className="text-indigo-500" />;
      case "read":
        return <HiEye size={13} className="text-green-500" />;
      default:
        return null;
    }
  }, [isUserMessage, status]);

  const renderContent = () => {
    if (message?.contentType === "image" || message?.contentType === "video") {
      const isVideo = message?.contentType === "video";
      return (
        <div
          className="relative rounded-md overflow-hidden cursor-pointer"
          onClick={() => setPreviewMedia(message.imageOrVideoUrl)}
        >
          {isVideo ? (
            <video
              src={message.imageOrVideoUrl}
              className="max-w-full h-auto rounded-md object-cover"
            />
          ) : (
            <img
              src={message.imageOrVideoUrl}
              alt="media"
              className="max-w-full h-auto rounded-md object-cover"
              draggable={false}
            />
          )}
          <span className="absolute bottom-1 right-2 text-[11px] bg-black/50 text-white px-1 rounded">
            {formattedTime}
          </span>
        </div>
      );
    }

    return (
      <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
        {message?.content}
      </p>
    );
  };

  const containerClass = isUserMessage ? "justify-end" : "justify-start";
  const bubbleTheme = isUserMessage
    ? theme === "dark"
      ? "bg-emerald-600 text-white"
      : "bg-emerald-100 text-black"
    : theme === "dark"
    ? "bg-gray-800 text-gray-100"
    : "bg-gray-100 text-black";

  return (
    <>
      {/* 🗑️ Delete Header (sender only on mobile) */}
      <AnimatePresence>
        {isHeaderVisible && isUserMessage && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 w-full bg-emerald-600 text-white h-12 flex items-center justify-between px-4 z-50 shadow-md"
          >
            <div />
            <button
              onClick={handleDelete}
              className="text-white text-lg active:scale-90"
            >
              <FaTrash />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 Message Bubble */}
      <motion.div
        ref={elRef}
        className={`flex ${containerClass} w-full mb-3 px-2 ${
          selected ? "bg-emerald-200/40 dark:bg-emerald-700/30" : ""
        }`}
        onPointerUp={handlePointerUp}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        <div
          className={`relative max-w-[82%] md:max-w-[65%] p-3 rounded-lg shadow-sm ${bubbleTheme}`}
        >
          {/* 3-dot actions (desktop only) */}
          {!isMobile && (
            <MessageActions
              message={message}
              theme={theme}
              isUserMessage={isUserMessage}
              isMobile={isMobile}
              onReact={() => setShowReactions(!showReactions)}
            />
          )}

          <div className="min-h-[36px]">{renderContent()}</div>

          {/* Time + Status */}
          {message?.contentType === "text" && (
            <div className="flex items-center gap-1 justify-end mt-1 text-[11px] opacity-75">
              {formattedTime && <span>{formattedTime}</span>}
              {renderStatus()}
            </div>
          )}

          {/* Emoji Reactions */}
          <AnimatePresence>
            {groupedReactions.length > 0 && (
              <motion.div
                className={`flex gap-2 mt-2 ${
                  isUserMessage ? "justify-end" : "justify-start"
                }`}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
              >
                {groupedReactions.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm ${
                      theme === "dark"
                        ? "bg-white/10 border border-white/10"
                        : "bg-white/80 border border-gray-200"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[12px] opacity-70">x{r.count}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reaction Picker */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-lg rounded-full flex gap-2 px-3 py-1 z-20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {REACTION_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleReaction(e)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 🖼️ Media Preview Modal */}
      {/* 🖼️ Media Preview Modal */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewMedia(null)}
          >
            {previewMedia.endsWith(".mp4") ? (
              <video
                src={previewMedia}
                controls
                autoPlay
                className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
              />
            ) : (
              <img
                src={previewMedia}
                alt="preview"
                className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageBubble;
