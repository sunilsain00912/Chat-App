const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const User = require("../models/User"); // ✅ add this

router.post("/send-message", authMiddleware, multerMiddleware, chatController.sendMessage);
router.get("/conversations", authMiddleware, chatController.getConversation);
router.get("/conversations/:conversationId/messages", authMiddleware, chatController.getMessage);
router.put("/messages/read", authMiddleware, chatController.markAsRead);
router.delete("/messages/:messageId", authMiddleware, chatController.deleteMessage);

// ✅ Add this route
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
