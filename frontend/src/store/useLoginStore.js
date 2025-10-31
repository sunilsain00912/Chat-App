import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const useLoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,

      setStep: (step) => set({ step }),
      setUserPhoneData: (userData) => set({ userPhoneData: userData }),
      resetLoginState: () => set({ step: 1, userPhoneData: null }),

      // ✅ Send OTP
      sendOtp: async (phoneNumber, phoneSuffix, email) => {
        try {
          const payload = { phoneNumber, phoneSuffix, email };
          console.log("✅ API_BASE_URL:", API_BASE_URL);

          const res = await axios.post(
            `${API_BASE_URL}/auth/send-otp`,
            payload,
            {
              headers: { "Content-Type": "application/json" },
              withCredentials: true,
            }
          );

          return res.data;
        } catch (err) {
          console.error("Send OTP Error:", err);
          throw new Error(
            err.response?.data?.message || "Failed to send OTP. Try again."
          );
        }
      },

      // ✅ Verify OTP
      verifyOtp: async (phoneNumber, phoneSuffix, otp, email) => {
        try {
          const payload = { phoneNumber, phoneSuffix, otp, email };

          const res = await axios.post(
            `${API_BASE_URL}/auth/verify-otp`,
            payload,
            {
              headers: { "Content-Type": "application/json" },
              withCredentials: true,
            }
          );

          return res.data;
        } catch (err) {
          console.error("Verify OTP Error:", err);
          throw new Error(
            err.response?.data?.message || "OTP verification failed."
          );
        }
      },

      // ✅ Update Profile
      updateProfile: async (formData) => {
        try {
          const res = await axios.put(
            `${API_BASE_URL}/auth/update-profile`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              withCredentials: true,
            }
          );

          return res.data;
        } catch (err) {
          console.error("Update Profile Error:", err);
          throw new Error(
            err.response?.data?.message || "Profile update failed."
          );
        }
      },
    }),

    {
      name: "login-storage",
      partialize: (state) => ({
        step: state.step,
        userPhoneData: state.userPhoneData,
      }),
    }
  )
);

export default useLoginStore;
