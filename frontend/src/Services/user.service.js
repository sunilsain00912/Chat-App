import axiosInstance from "./url.Service";

// 📱 Send OTP
export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// ✅ Verify OTP
export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      otp,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// 🧑‍💻 Update User Profile (supports image upload via multer)
export const updateUserProfile = async (formData) => {
  try {
    const response = await axiosInstance.put("/auth/update-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" }, // 👈 Required for file upload
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// 🔐 Check user authentication
export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    if (response.data.status === "success") {
      return { isAuthenticated: true, user: response?.data?.data };
    } else if (response.data.status === "error") {
      return { isAuthenticated: false };
    }
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// 🚪 Logout user
export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/logout", {}, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};


// 👥 Get all users
export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get("/auth/users");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
