// ✅ Utility to convert base64 public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ✅ Main function to subscribe user to push notifications
export async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator)) return;

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      console.error("❌ VAPID key missing! Check your .env file.");
      return;
    }

    // Register service worker
    const reg = await navigator.serviceWorker.register("/service-worker.js");

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("❌ Notification permission denied");
      return;
    }

    // Subscribe to push notifications
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Send subscription to backend
    await fetch("https://whatsapp-clone-1-r6zn.onrender.com/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.error("❌ Failed to subscribe to push:", err);
  }
}
