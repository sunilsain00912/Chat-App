export const playNotificationSound = () => {
  try {
    const audio = new Audio("/sounds/Noti.Ring.wav");
    audio.volume = 0.6; // not too loud
    audio.play().catch(() => {}); // ignore autoplay restrictions
  } catch (err) {
    console.warn("Sound play failed:", err);
  }
};
