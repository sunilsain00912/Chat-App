import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/chatStore";
import { isToday, isYesterday, format, isValid } from "date-fns";
import whatsappImage from "../../images/whatsapp_image.png";
import {
  FaLock,
  FaArrowLeft,
  FaPaperPlane,
  FaFile,
  FaVideo,
  FaEllipsisV,
  FaSmile,
  FaPaperclip,
  FaImage,
  FaTimes,
} from "react-icons/fa";
import MessageBubble from "../chatSection/MessageBubble";
import EmojiPicker from "emoji-picker-react";

/* ✅ Helper to check valid date */
const isValidDate = (date) => date instanceof Date && !isNaN(date);

const ChatWindow = ({ selectedContact, setSelectedContact }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    messages,
    sendMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    deleteMessage,
    addReaction,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  /* ✅ Fetch conversations once */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ✅ Fetch messages for selected contact */
  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((conv) =>
        conv.participants.some((p) => p._id === selectedContact?._id)
      );
      if (conversation?._id) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact, conversations, fetchMessages]);

  /* ✅ Scroll to bottom whenever messages update */
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ✅ Typing indicator */
  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact?._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 2000);
    }
    return () => clearTimeout(typingTimeoutRef.current);
  }, [message, selectedContact, startTyping, stopTyping]);

  /* ✅ Reset chat if page reloaded or navigated to home */
  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || !selectedContact) {
      setSelectedContact(null);
      sessionStorage.removeItem("selectedChat");
      localStorage.removeItem("lastConversation");
    }
  }, [location.pathname]);

  /* ✅ Cleanup on tab close / refresh */
  useEffect(() => {
    const handleUnload = () => {
      setSelectedContact(null);
      sessionStorage.removeItem("selectedChat");
      localStorage.removeItem("lastConversation");
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  /* ✅ Handle back button (browser or phone) */
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      if (selectedContact) {
        setSelectedContact(null);
        localStorage.removeItem("lastConversation");
        sessionStorage.removeItem("selectedChat");
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.pathname);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [selectedContact, setSelectedContact]);

  /* ✅ File handling */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  /* ✅ Send message */
  const handleSendMessage = async () => {
    if (!selectedContact) return;
    try {
      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);

      const status = online ? "delivered" : "sent";
      formData.append("messageStatus", status);

      if (message.trim()) formData.append("content", message.trim());
      if (selectedFile)
        formData.append("media", selectedFile, selectedFile.name);

      if (!message.trim() && !selectedFile) return;

      await sendMessage(formData);
      setMessage("");
      setFilePreview(null);
      setSelectedFile(null);
      setShowFileMenu(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  /* ✅ Date separator */
  const renderDateSeparator = (date) => {
    if (!isValidDate(date)) return null;
    let dateString;
    if (isToday(date)) dateString = "Today";
    else if (isYesterday(date)) dateString = "Yesterday";
    else dateString = format(date, "EEEE, MMMM d");

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  /* ✅ Group messages by date */
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, msg) => {
        const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;
        if (isValidDate(createdAt)) {
          const dateString = format(createdAt, "yyyy-MM-dd");
          if (!acc[dateString]) acc[dateString] = [];
          acc[dateString].push(msg);
        }
        return acc;
      }, {})
    : {};

  /* ✅ Reaction handler */
  const handleReaction = (messageId, emoji) => {
    if (!messageId || !emoji) return;
    try {
      addReaction(messageId, emoji);
    } catch (err) {
      console.error("⚠️ Reaction error:", err);
    }
  };

  /* ✅ Empty state (no contact selected) */
  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center overflow-hidden">
        <div className="max-w-md px-4">
          <img
            src={whatsappImage}
            alt="chat-app"
            className="w-full h-auto rounded-xl"
          />
          <h2
            className={`text-3xl font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          >
            Select a conversation to start chatting
          </h2>
          <p
            className={`${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            } mb-6`}
          >
            Choose a contact from the list on the left to begin messaging.
          </p>
          <p
            className={`${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            } text-sm mt-8 flex items-center justify-center`}
          >
            <FaLock className="h-4 w-4 mr-2" />
            Your personal messages are end-to-end encrypted.
          </p>
        </div>
      </div>
    );
  }

  /* ✅ Main chat UI */
  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div
        className={`p-4 flex items-center w-full z-30 
    ${
      theme === "dark"
        ? "bg-[#303030] border-gray-700"
        : "bg-white border-gray-200"
    } 
    md:sticky md:top-0 fixed top-0
  `}
        style={{
          height: "64px",
        }}
      >
        <button
          className="mr-3 md:hidden focus:outline-none"
          onClick={() => setSelectedContact(null)}
        >
          <FaArrowLeft className="w-6 h-6" />
        </button>

        <img
          src={selectedContact?.profilePicture || "/default-avatar.png"}
          alt={selectedContact?.username}
          className="w-10 h-10 rounded-full cursor-pointer"
          onClick={() => {
            if (selectedContact?._id)
              navigate(`/profile/${selectedContact._id}`);
          }}
        />

        <div className="ml-3 flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {selectedContact?.username}
          </h2>
          {isTyping ? (
            <p className="text-sm text-green-400">Typing...</p>
          ) : (
            <p
              className={`text-sm truncate ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {online
                ? "Online"
                : lastSeen
                ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                : "Offline"}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button className="focus:outline-none">
            <FaVideo className="h-5 w-5" />
          </button>
          <button className="focus:outline-none">
            <FaEllipsisV className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat body */}
      {/* ✅ Chat body (scrollable message area) */}
      <div
        className={`flex-1 overflow-y-auto px-3 py-2 custom-scrollbar 
    ${theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"} 
    h-[calc(100vh-130px)]`} // adjust this height as needed
      >
        <div className="flex flex-col justify-end min-h-full">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <React.Fragment key={date}>
              {renderDateSeparator(new Date(date))}
              {msgs.map((msg) => (
                <MessageBubble
                  key={msg._id || msg.tempId}
                  message={msg}
                  theme={theme}
                  currentUser={user}
                  onReact={handleReaction}
                  deleteMessage={deleteMessage}
                />
              ))}
            </React.Fragment>
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* File Preview */}
      {filePreview && (
        <div className="relative p-3 bg-black/20">
          <img
            src={filePreview}
            alt="file-preview"
            className="w-72 md:w-80 object-cover rounded-lg shadow-lg mx-auto"
          />
          <button
            onClick={() => {
              setSelectedFile(null);
              setFilePreview(null);
            }}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input */}
      {/* Message Input */}
      <div
        className={`p-4 flex items-center space-x-2 border-t ${
          theme === "dark"
            ? "bg-[#303030] border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        {/* ✅ Emoji Button — only desktop */}
        <div className="relative hidden md:block">
          <button
            className="focus:outline-none"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
          >
            <FaSmile
              className={`h-6 w-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            />
          </button>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-14 left-0 z-50 shadow-lg"
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) =>
                  setMessage((prev) => prev + emojiObject.emoji)
                }
                theme={theme === "dark" ? "dark" : "light"}
              />
            </div>
          )}
        </div>

        {/* File Button */}
        <div className="relative">
          <button
            className="focus:outline-none"
            onClick={() => setShowFileMenu((prev) => !prev)}
          >
            <FaPaperclip
              className={`h-6 w-6 mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            />
          </button>

          {showFileMenu && (
            <div
              className={`absolute bottom-full left-0 mb-2 rounded-lg shadow-md ${
                theme === "dark" ? "bg-gray-700" : "bg-white"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className={`flex items-center px-4 py-2 w-full text-sm ${
                  theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                }`}
              >
                <FaImage className="mr-2" /> Image / Video
              </button>
              <button
                onClick={() => fileInputRef.current.click()}
                className={`flex items-center px-4 py-2 w-full text-sm ${
                  theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                }`}
              >
                <FaFile className="mr-2" /> Documents
              </button>
            </div>
          )}
        </div>

        {/* Message Input Field */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message"
          className={`grow px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-white border border-gray-600"
              : "bg-white text-black border border-gray-300"
          }`}
        />

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          className="focus:outline-none active:scale-95 transition"
        >
          <FaPaperPlane className="h-6 w-6 text-green-500" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
