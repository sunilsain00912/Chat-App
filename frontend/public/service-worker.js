/* eslint-disable no-undef */
self.addEventListener("push", function (event) {
  const data = event.data.json();

  const options = {
    body: data.body || "You have a new message",
    icon: "/icon-192x192.png", // apne logo ka path
    badge: "/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "New Notification", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("http://localhost:5173") // open your frontend
  );
});
