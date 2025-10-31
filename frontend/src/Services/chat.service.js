import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;

export const initializeSocket = () => {
  if (socket && socket.connected) {
    console.log("🔁 Socket already initialized:", socket.id);
    return socket;
  }

  const user = useUserStore.getState().user;
  const BACKEND_URL = import.meta.env.VITE_SOCKET_URL;

  try {
    socket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000, // 10s timeout
    });
  } catch (error) {
    console.error("❌ Socket initialization failed:", error);
    return null;
  }

  
    //  ✅ CONNECTION EVENTS
  
  socket.on("connect", () => {
    if (user?._id) {
      socket.emit("user_connected", user._id);
    } else {
      console.warn("⚠️ No user found in store — not emitting user_connected");
    }
  });

  socket.on("connect_error", (error) => {
    console.error("🚫 Socket connection error:", error.message || error);
    console.warn("👉 Check if your BACKEND_URL and CORS setup are correct.");
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log(`🔁 Reconnection attempt ${attempt}...`);
  });

  socket.on("reconnect_failed", () => {
    console.error("❌ Socket failed to reconnect after multiple attempts.");
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);

    if (reason === "io server disconnect") {
      console.log("🔄 Server disconnected — reconnecting manually...");
      socket.connect();
    } else if (reason === "transport close") {
      console.warn("⚠️ Connection transport closed — will auto-reconnect.");
    }
  });

  
    //  🧠 CUSTOM EVENTS
  
  socket.on("user_status", (data) => {
    console.log("📶 User status update:", data);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn("⚠️ Socket not initialized yet. Initializing now...");
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  } else {
    console.warn("⚠️ No active socket to disconnect.");
  }
};
