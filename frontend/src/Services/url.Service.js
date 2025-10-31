import axios from "axios";

// ✅ Get the backend URL from your .env file
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Create an axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// (Optional) Debugging interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Axios Error:", error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
