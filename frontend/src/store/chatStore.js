// store/chatStore.js
import { create } from "zustand";
import { getSocket } from "../Services/chat.service";
import axiosInstance from "../Services/url.Service";
import { playNotificationSound } from "../utils/playSound";

const getConvId = (conv) =>
  conv == null
    ? ""
    : typeof conv === "string"
    ? conv
    : String(conv._id || conv);

// Helper to ensure currentConversation is stored as object (at least with _id)
const normalizeConversationRef = (convOrId) => {
  if (!convOrId) return null;
  if (typeof convOrId === "string") return { _id: convOrId };
  return convOrId;
};

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  currentUser: null,

  // helper
  clearConversation: () => set({ currentConversation: null }),

  // 🔹 Setters
  setCurrentConversation: (conversation) =>
    set({ currentConversation: normalizeConversationRef(conversation) }),
  setCurrentUser: (user) => set({ currentUser: user }),

  // 🔹 Initialize socket listeners
  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Safe off of known events
    [
      "receive_message",
      "new_message",
      "user_typing",
      "user_status",
      "message_send",
      "message_error",
      "message_deleted",
      "reaction_update",
      "message_status_update",
      "conversation_read",
    ].forEach((ev) => socket.off(ev));

    const safeGet = () => get();

    // Incoming messages handler (shared)
    const onIncoming = (message) => {
      const state = safeGet();
      const currentConvId = getConvId(state.currentConversation);
      const msgConvId =
        String(message.conversation?._id || message.conversation || "") || "";

      // If message belongs to open chat, add and mark read
      if (currentConvId && currentConvId === msgConvId) {
        state.receiveMessage(message);
      } else {
        // increment unread preview for the conversation
        set((prev) => {
          const convList = Array.isArray(prev.conversations)
            ? prev.conversations
            : prev.conversations?.data || [];

          const updated = convList.map((conv) => {
            if (String(conv._id) === msgConvId) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: message,
              };
            }
            return conv;
          });

          return {
            conversations: Array.isArray(prev.conversations)
              ? [...updated]
              : { ...prev.conversations, data: [...updated] },
          };
        });
      }
    };

    socket.on("receive_message", onIncoming);
    socket.on("new_message", onIncoming);

    // Reaction update
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    // message status update (by message)
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      // update message object(s)
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    // conversation-level read notification (clears unreadCount)
    socket.on("conversation_read", ({ conversationId, readerId }) => {
      if (!conversationId) return;

      set((state) => {
        const convList = Array.isArray(state.conversations)
          ? state.conversations
          : state.conversations?.data || [];

        const updated = convList.map((conv) =>
          String(conv._id) === String(conversationId)
            ? { ...conv, unreadCount: 0 }
            : conv
        );

        // also, if the currentConversation matches, update it
        const currentConv = state.currentConversation
          ? normalizeConversationRef(state.currentConversation)
          : null;
        if (currentConv && String(currentConv._id) === String(conversationId)) {
          return {
            conversations: Array.isArray(state.conversations)
              ? [...updated]
              : { ...state.conversations, data: [...updated] },
            currentConversation: { ...currentConv, unreadCount: 0 },
          };
        }

        return {
          conversations: Array.isArray(state.conversations)
            ? [...updated]
            : { ...state.conversations, data: [...updated] },
        };
      });
    });

    // message deleted
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    // message error
    socket.on("message_error", (error) => {
      console.error("Socket message error:", error);
    });

    // typing updates
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTyping = new Map(state.typingUsers);
        const convId = getConvId(conversationId);
        if (!newTyping.has(convId)) newTyping.set(convId, new Set());
        const setForConv = newTyping.get(convId);
        if (isTyping) setForConv.add(userId);
        else setForConv.delete(userId);
        return { typingUsers: newTyping };
      });
    });

    // user online/offline
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const updated = new Map(state.onlineUsers);
        updated.set(userId, { isOnline, lastSeen: isOnline ? null : lastSeen });
        return { onlineUsers: new Map(updated) };
      });
    });

    // reconnect: re-initialize for safety
    socket.on("connect", () => {
      // avoid infinite recursion if called repeatedly — re-attach to ensure handlers in place
      get().initSocketListeners();
    });

    // If we have conversations and a currentUser, request statuses
    const { conversations, currentUser } = get();
    if (currentUser && conversations) {
      const list = Array.isArray(conversations)
        ? conversations
        : conversations?.data || [];
      list.forEach((conv) => {
        const other = conv.participants?.find((p) => p._id !== currentUser._id);
        if (other?._id) {
          socket.emit("get_user_status", other._id, (status) => {
            set((state) => {
              const newOnline = new Map(state.onlineUsers);
              newOnline.set(other._id, {
                isOnline: status?.isOnline ?? false,
                lastSeen: status?.lastSeen ?? null,
              });
              return { onlineUsers: newOnline };
            });
          });
        }
      });
    }
  },

  // fetch conversations
  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/chats/conversations");
      set({ conversations: data, loading: false });
      // init after we have convs (and make sure currentUser set from auth flow)
      get().initSocketListeners();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  // fetch messages for a conversation - sets currentConversation to object when possible
  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(
        `/chats/conversations/${conversationId}/messages`
      );
      const messageArray = data?.data || data || [];

      // ensure we set currentConversation as object (prefer conversation object from conversations list)
      const state = get();
      let convRef = normalizeConversationRef(conversationId);
      const convList = Array.isArray(state.conversations)
        ? state.conversations
        : state.conversations?.data || [];
      const found = convList.find(
        (c) => String(c._id) === String(conversationId)
      );
      if (found) convRef = found;

      set({
        messages: messageArray,
        currentConversation: convRef,
        loading: false,
      });

      // mark unread as read for current user (updates UI instantly)
      get().markMessagesAsRead();

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return [];
    }
  },

  // send message (optimistic)
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");
    const socket = getSocket();
    const { conversations } = get();
    let conversationId = null;
    let conversationObj = null;

    // find existing conversation object (if present)
    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );
      if (conversation) {
        conversationId = conversation._id;
        conversationObj = conversation;
        set({ currentConversation: conversationObj });
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
      imageOrVideoUrl:
        media && typeof media !== "string" && media instanceof File
          ? URL.createObjectURL(media)
          : null,
      content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      createdAt: new Date().toISOString(),
      messageStatus,
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const messageData = data.data || data;

      // replace optimistic
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));

      // update conversation preview (lastMessage)
      set((state) => {
        const convList = Array.isArray(state.conversations)
          ? state.conversations
          : state.conversations?.data || [];

        const updated = convList.map((conv) =>
          String(conv._id) === String(messageData.conversation)
            ? { ...conv, lastMessage: messageData }
            : conv
        );

        return {
          conversations: Array.isArray(state.conversations)
            ? [...updated]
            : { ...state.conversations, data: [...updated] },
        };
      });

      // emit to server
      if (socket) socket.emit("send_message", messageData);

      // route to receiveMessage to handle unread or open chat logic
      get().receiveMessage(messageData);

      return messageData;
    } catch (error) {
      console.error("Error sending message:", error);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "Failed" } : msg
        ),
        error: error?.response?.data?.message || error?.message,
      }));
      throw error;
    }
  },

  // receive message
  receiveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser, messages } = get();

    // avoid duplicates
    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return;

    const msgConvId = String(
      message.conversation?._id || message.conversation || ""
    );
    const currentConvId = getConvId(currentConversation);
    const isReceiver = message.receiver?._id === currentUser?._id;

    const chatIsOpen = currentConvId && currentConvId === msgConvId;
    const windowIsFocused = document.hasFocus();

    // notification only if we are the receiver and chat not open
    if (isReceiver && !chatIsOpen) {
      playNotificationSound();
      if (Notification.permission === "granted" && !windowIsFocused) {
        new Notification(message.sender?.username || "New Message", {
          body: message.content || "You have a new message 💬",
          icon: message.sender?.profilePicture || "/default-avatar.png",
          silent: true,
        });
      }
    }

    if (chatIsOpen) {
      // push to messages
      set((state) => ({ messages: [...state.messages, message] }));

      // reset unread count for that conversation AND currentConversation object
      set((state) => {
        const convList = Array.isArray(state.conversations)
          ? state.conversations
          : state.conversations?.data || [];

        const updatedList = convList.map((conv) =>
          String(conv._id) === String(msgConvId)
            ? { ...conv, unreadCount: 0 }
            : conv
        );

        const currentConv = state.currentConversation
          ? {
              ...normalizeConversationRef(state.currentConversation),
              unreadCount: 0,
            }
          : state.currentConversation;

        return {
          conversations: Array.isArray(state.conversations)
            ? [...updatedList]
            : { ...state.conversations, data: [...updatedList] },
          currentConversation: currentConv,
        };
      });

      // if we are receiver, immediately mark as read
      if (isReceiver) get().markMessagesAsRead();
    } else {
      // increment unread for other convs
      set((state) => {
        const convList = Array.isArray(state.conversations)
          ? state.conversations
          : state.conversations?.data || [];

        const updatedList = convList.map((conv) => {
          if (String(conv._id) === msgConvId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: isReceiver
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
            };
          }
          return conv;
        });

        return {
          conversations: Array.isArray(state.conversations)
            ? [...updatedList]
            : { ...state.conversations, data: [...updatedList] },
        };
      });
    }
  },

  // mark messages as read
  markMessagesAsRead: async () => {
    const { messages, currentUser, currentConversation } = get();
    if (!messages.length || !currentUser || !currentConversation) return;

    const convId = getConvId(currentConversation);
    if (!convId) return;

    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" &&
          String(msg.receiver?._id) === String(currentUser?._id) &&
          String(msg.conversation?._id || msg.conversation) === String(convId)
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    // 1) Immediately update local state for instant UI feedback
    set((state) => {
      const updatedMessages = state.messages.map((msg) =>
        unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
      );

      const convList = Array.isArray(state.conversations)
        ? state.conversations
        : state.conversations?.data || [];

      const updatedConvs = convList.map((conv) =>
        String(conv._id) === String(convId) ? { ...conv, unreadCount: 0 } : conv
      );

      const currentConv = state.currentConversation
        ? {
            ...normalizeConversationRef(state.currentConversation),
            unreadCount: 0,
          }
        : state.currentConversation;

      return {
        messages: updatedMessages,
        conversations: Array.isArray(state.conversations)
          ? [...updatedConvs]
          : { ...state.conversations, data: [...updatedConvs] },
        currentConversation: currentConv,
      };
    });

    try {
      // 2) Sync to backend
      await axiosInstance.put("/chats/messages/read", {
        messageIds: unreadIds,
      });

      // 3) Emit socket event to notify others (include readerId)
      const socket = getSocket();
      socket?.emit("message_read", {
        messageIds: unreadIds,
        conversationId: convId,
        readerId: get().currentUser?._id,
      });
    } catch (err) {
      // keep local state as optimistic fallback, but log error
      console.error("❌ Failed marking messages as read:", err);
    }
  },

  // delete message
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);
      set((state) => ({
        messages: state.messages?.filter((msg) => msg._id !== messageId),
      }));
      return true;
    } catch (error) {
      console.error("Error deleting message", error);
      set({ error: error?.response?.data?.message || error?.message });
      return false;
    }
  },

  // add reaction
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (!socket?.connected || !currentUser?._id) return;
    socket.emit("add_reaction", { messageId, emoji, userId: currentUser._id });
  },

  // typing start/stop
  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    const convId = getConvId(currentConversation);
    if (socket && convId && receiverId) {
      socket.emit("typing_start", { conversationId: convId, receiverId });
    }
  },

  stopTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    const convId = getConvId(currentConversation);
    if (socket && convId && receiverId) {
      socket.emit("typing_stop", { conversationId: convId, receiverId });
    }
  },

  // helpers
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    const convId = getConvId(currentConversation);
    if (!convId || !typingUsers.has(convId) || !userId) return false;
    return typingUsers.get(convId).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanup: () => {
    const socket = getSocket();
    if (socket) {
      [
        "receive_message",
        "new_message",
        "user_typing",
        "user_status",
        "reaction_update",
        "message_deleted",
        "message_status_update",
        "conversation_read",
      ].forEach((ev) => socket.off(ev));
    }
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
      currentUser: null,
    });
  },

  // ✅ Persist current chat
  persistChat: () => {
    const state = get();
    if (state.currentConversation?._id) {
      localStorage.setItem(
        "lastConversation",
        JSON.stringify(state.currentConversation)
      );
    }
  },

  // ✅ Clear persisted chat
  clearPersistedChat: () => {
    localStorage.removeItem("lastConversation");
  },
}));

// ✅ Cleanup when browser/tab closes
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    try {
      const { setState } = useChatStore;
      setState({
        currentConversation: null,
        messages: [],
      });
      sessionStorage.removeItem("lastChatId");
    } catch (err) {
      console.warn("Chat store cleanup failed:", err);
    }
  });
}
