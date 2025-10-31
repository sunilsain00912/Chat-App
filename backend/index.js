const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const http = require("http");
const webpush = require("web-push");
const { Resend } = require("resend"); // 🟢 added for email service

dotenv.config();

const PORT = process.env.PORT || 8000;

// 🌍 Web Push Config
webpush.setVapidDetails(
  "mailto:sunilsain0912@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 🟢 Initialize Resend Email API
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "WhatsApp Clone <onboarding@resend.dev>";

// 🌐 CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://chat-app-three-snowy-72.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("🚫 [CORS] Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔌 Create HTTP Server & Initialize Socket.IO
const connectDb = require("./config/connectDb");
const initializeSocket = require("./services/socketService");
const server = http.createServer(app);
const io = initializeSocket(server);

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// 📦 Routes
const authRoutes = require("./routes/authRoutes");
const chatRoute = require("./routes/chatRoute");
const statusRoute = require("./routes/statusRoutes");
const pushRoutes = require("./routes/pushRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoute);
app.use("/api/status", statusRoute);
app.use("/api", pushRoutes);

// 🧠 Connect MongoDB
connectDb().catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 🟢 EMAIL OTP API (Main new addition)
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Send email using Resend
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your WhatsApp Clone OTP 🔐",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Login Verification</h2>
          <p>Use this OTP to continue:</p>
          <h1 style="letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

    console.log(`📧 OTP ${otp} sent to ${email}`);

    // Store OTP temporarily in memory (you can replace this with DB)
    if (!global.otpStore) global.otpStore = {};
    global.otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    res.json({ success: true, message: "OTP sent to email successfully!" });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
});

// ✅ VERIFY OTP
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

  const stored = global.otpStore?.[email];
  if (!stored) return res.status(400).json({ error: "OTP not found or expired" });
  if (Date.now() > stored.expires) return res.status(400).json({ error: "OTP expired" });

  if (Number(otp) === Number(stored.otp)) {
    delete global.otpStore[email];
    return res.json({ success: true, message: "OTP verified successfully" });
  } else {
    return res.status(400).json({ error: "Invalid OTP" });
  }
});

// 🚀 Start Server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// 💥 Error Handling
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
});
process.on("SIGINT", () => {
  console.log("\n👋 Gracefully shutting down server...");
  server.close(() => {
    console.log("🧹 Server closed. Exiting now.");
    process.exit(0);
  });
});
