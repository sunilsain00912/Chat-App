# Chat App (MERN)

[Live Demo → https://chat-app-three-snowy-72.vercel.app](https://chat-app-three-snowy-72.vercel.app)

> A realtime chat application built with the MERN stack (MongoDB, Express, React, Node) with WebSockets (Socket.IO), OTP login via email (Resend), push notifications, and a WhatsApp-like UI.

---

## 🔥 Highlights
- Realtime messaging with Socket.IO
- OTP email login (Resend API) — Render/Vercel compatible (no SMTP)
- Message delivery status, online presence, read receipts
- File / image preview (WhatsApp style)
- Web Push notifications (VAPID keys)
- Mobile-friendly UI (React / Tailwind or your UI stack)
- Easy to deploy: Vercel (frontend) + Render (backend) or your preferred hosts

---

## 🧭 Demo & Repo
- **Demo:** https://chat-app-three-snowy-72.vercel.app  
- **Repository:** `https://github.com/sunilsain00912/Chat-App`

---

## 🧩 Tech Stack
- Frontend: React (Vite or CRA), Tailwind CSS (optional), Socket.IO-client
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB (Atlas recommended)
- Email: Resend (API) for OTP
- Push: Web Push (VAPID)
- Auth: OTP-based login (stateless JWT or session-based — implement as needed)

---

## ✅ Features
- OTP login (email) and OTP verification endpoints
- Realtime one-to-one chat with typing indicators
- Message database (MongoDB) with timestamps and status
- Image/file upload & preview
- Push notifications support (VAPID public/private keys)
- CORS-safe configuration for production (uses domain allowlist)
- Rate limiting for OTP requests and in-memory/Redis OTP store

---

## 🚀 Quick start (local)

### Prerequisites
- Node.js >= 18
- npm or yarn
- MongoDB connection (Atlas recommended)
- Resend API key (for email)
- VAPID public & private keys (for web-push) — generate with `web-push` or libraries

### 1) Clone repo
```bash
git clone https://github.com/sunilsain00912/Chat-App.git
cd Chat-App
