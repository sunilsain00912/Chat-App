import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (userData) => set({ user: userData, isAuthenticated: true }),

      clearUser: () => {
        // 🔥 Clear Zustand state + localStorage immediately
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem("user-storage");
        sessionStorage.clear();
      },
    }),
    {
      name: "user-storage",
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        // 🔍 If user-storage is empty, reset everything
        if (!localStorage.getItem("user-storage")) {
          state?.clearUser?.();
        }
      },
    }
  )
);

export default useUserStore;
