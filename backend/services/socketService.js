const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

// ✅ Allow multiple sockets per user
const onlineUsers = new Map();
const typingUsers = new Map();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://chat-app-three-snowy-72.vercel.app",
];

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log("🚫 [Socket.IO] Blocked origin:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    transports: ["websocket"],
    pingTimeout: 60000,
  });

  io.engine.on("connection_error", (err) => {
    console.error(
      "🚨 Socket.IO Engine Connection Error:",
      err.req.headers.origin,
      err.code,
      err.message
    );
  });

  io.on("connection", (socket) => {
    let userId = null;
    /* ===========================
     🔹 USER CONNECTED
    =========================== */
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        if (!userId) return;

        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);
        socket.join(userId);

        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // 🔹 Notify everyone that THIS user is online
        io.emit("user_status", { userId, isOnline: true, lastSeen: null });

        // 🔹 Send this user all CURRENT online users (sync)
        for (const [otherUserId] of onlineUsers.entries()) {
          if (otherUserId !== userId) {
            socket.emit("user_status", { userId: otherUserId, isOnline: true });
          }
        }
      } catch (error) {
        console.error("❌ Error in user_connected:", error);
      }
    });

    /* ===========================
     🔹 GET USER STATUS
    =========================== */
    socket.on("get_user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    // 🔹 SEND MESSAGE

    socket.on("send_message", async (message) => {
      try {
        if (!message?.receiver?._id) return;
        const receiverSockets = onlineUsers.get(message.receiver._id);

        if (receiverSockets) {
          for (const sid of receiverSockets) {
            io.to(sid).emit("receive_message", message);
          }
        }
      } catch (error) {
        console.error("❌ Error sending message:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    //  🔹 MESSAGE READ RECEIPTS

    socket.on("message_read", async ({ messageIds, conversationId }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        // ✅ Mark messages as read in DB
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        // ✅ Find all updated messages
        const updatedMessages = await Message.find({
          _id: { $in: messageIds },
        });

        // ✅ Emit read receipts to sender(s)
        updatedMessages.forEach((msg) => {
          const senderId =
            msg.sender?._id?.toString?.() || msg.sender?.toString?.();
          if (!senderId) return;

          const senderSockets = onlineUsers.get(senderId);
          if (senderSockets) {
            for (const sid of senderSockets) {
              io.to(sid).emit("message_status_update", {
                messageId: msg._id,
                messageStatus: "read",
              });
            }
          }
        });
      } catch (error) {
        console.error("❌ Error in message_read:", error);
      }
    });

    //  🔹 TYPING EVENTS

    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});
      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      // clear old timeout
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // auto-stop typing after 2s
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 2000);

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    /* ===========================
     🔹 ADD / UPDATE REACTION
    =========================== */
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId: reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) {
            console.warn("⚠️ [Server] Message not found:", messageId);
            return;
          }

          // Add / Update / Remove reaction
          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );

          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              message.reactions.splice(existingIndex, 1);
            } else {
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            message.reactions.push({ user: reactionUserId, emoji });
          }

          await message.save();

          const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .populate("reactions.user", "username profilePicture");

          const reactionsUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSockets =
            onlineUsers.get(populatedMessage.sender._id.toString()) ||
            new Set();
          const receiverSockets =
            onlineUsers.get(populatedMessage.receiver?._id?.toString()) ||
            new Set();

          const allSockets = [
            ...new Set([...senderSockets, ...receiverSockets]),
          ];

          if (allSockets.length > 0) {
            allSockets.forEach((sid) =>
              io.to(sid).emit("reaction_update", reactionsUpdated)
            );
          } else {
            console.warn(
              "⚠️ [Server] No active sockets found for sender/receiver."
            );
          }
        } catch (error) {
          console.error("❌ [Server] Error handling reactions:", error);
        }
      }
    );

    /* ===========================
     🔹 DISCONNECT HANDLER
    =========================== */
    const handleDisconnected = async () => {
      if (!userId) return;

      try {
        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);

          if (userSockets.size === 0) {
            onlineUsers.delete(userId);
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
            });

            io.emit("user_status", {
              userId,
              isOnline: false,
              lastSeen: new Date(),
            });
          }
        }

        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }

        socket.leave(userId);
      } catch (error) {
        console.error("❌ Error in handleDisconnected:", error);
      }
    };

    socket.on("disconnect", handleDisconnected);
  });

  io.socketUserMap = onlineUsers;
  return io;
};

module.exports = initializeSocket;
