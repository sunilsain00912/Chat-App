const express = require("express");
const webpush = require("web-push");

const router = express.Router();

// Temporary in-memory store (production mein DB use karo)
let subscriptions = [];

// 📩 Subscribe Route
router.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log("✅ New subscription received:", subscription.endpoint);

  res.status(201).json({ message: "Subscription saved successfully!" });
});

// 🚀 Send Notification Route
router.post("/send", async (req, res) => {
  const { title, body } = req.body;

  const payload = JSON.stringify({
    title: title || "New Notification",
    body: body || "You have a new update!",
    icon: "/icons/icon-192x192.png",
  });

  console.log("📨 Sending notification to", subscriptions.length, "subscribers");

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload).catch((err) => {
        console.error("❌ Failed to send:", err.message);
      })
    )
  );

  res.status(200).json({
    message: "Notifications sent!",
    results,
  });
});

module.exports = router;
