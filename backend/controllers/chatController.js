const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const response = require("../utils/responseHandler");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

// 📩 Send Message
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    if (!senderId || !receiverId) {
      return response(res, 400, "Sender and receiver are required ❌");
    }

    // ✅ Ensure ObjectIds are stored correctly
    const participants = [
      new mongoose.Types.ObjectId(senderId),
      new mongoose.Types.ObjectId(receiverId),
    ].sort();

    // 🔍 Check if conversation already exists
    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    // 📤 Handle file upload (if any)
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media ❌");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Unsupported file type ❌");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content is required ❌");
    }

    // 💬 Create and save message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus: messageStatus || "sent",
    });

    await message.save();

    // 🕓 Update conversation
    conversation.lastMessage = message._id;
    conversation.unreadCount += 1;
    await conversation.save();

    // 👥 Populate message data before returning
    const populatedMessage = await Message.findById(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    // 🛰️ Emit socket event for real time
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("retrieve_message", populatedMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 201, "Message sent successfully ✅", populatedMessage);
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 💬 Get All Conversations
exports.getConversation = async (req, res) => {
  const userId = req.user.userId;

  try {
    const conversations = await Conversation.find({
      participants: { $in: [userId] }, // ✅ Fix: use $in instead of direct match
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // 🚫 Remove the current user from participants for clean frontend display
    const formattedConversations = conversations.map((conv) => ({
      ...conv,
      participants: conv.participants.filter(
        (p) => p._id.toString() !== userId.toString()
      ),
    }));

    return response(
      res,
      200,
      "Conversations fetched successfully ✅",
      formattedConversations
    );
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 📨 Get Messages of a Conversation
exports.getMessage = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found ❌");
    }

    if (
      !conversation.participants.some(
        (id) => id.toString() === userId.toString()
      )
    ) {
      return response(res, 403, "Not authorized to view this conversation ❌");
    }

    const messages = await Message.find({
      conversation: conversationId,
      // deletedFor: { $ne: userId },
    })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt");

    // ✅ Mark all messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["sent", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Messages retrieved successfully ✅", messages);
  } catch (error) {
    console.error("❌ Error fetching conversation messages:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 🟢 Mark Messages as Read

exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return response(res, 400, "No message IDs provided ❌");
    }

    // Step 1️⃣: Find all messages
    const messages = await Message.find({ _id: { $in: messageIds } });

    if (!messages || messages.length === 0) {
      return response(res, 404, "No messages found ❌");
    }

    // Step 2️⃣: Update status to 'read'
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { messageStatus: "read" } }
    );

    // Step 3️⃣: Emit socket event for each sender
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSockets = req.socketUserMap.get(message.sender.toString());

        if (senderSockets && senderSockets.size > 0) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: "read",
          };

          for (const sid of senderSockets) {
            req.io.to(sid).emit("message_status_update", updatedMessage);
          }
        }
      }
    }

    return response(res, 200, "Messages marked as read ✅");
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 🗑️ Delete Message
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found ❌");
    }

    if (message.sender.toString() !== userId.toString()) {
      return response(res, 403, "Not authorized to delete this message ❌");
    }

    await message.deleteOne();

    // 🛰️ Emit socket event
    if (req.io && req.socketUserMap) {
      const receiverSockets = req.socketUserMap.get(
        message.receiver.toString()
      );

      if (receiverSockets && receiverSockets.size > 0) {
        for (const sid of receiverSockets) {
          req.io
            .to(sid)
            .emit("message_deleted", { deletedMessageId: messageId });
        }
      } else {
        console.warn(
          "⚠️ No active socket found for receiver:",
          message.receiver.toString()
        );
      }
    }

    return response(res, 200, "Message deleted successfully ✅");
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return response(res, 500, "Internal server error ❌");
  }
};
