import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import countries from "../../utils/countries";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { motion } from "framer-motion";
import {
  // FaWhatsapp,
  FaChevronDown,
  FaSpinner,
  FaArrowLeft,
  FaPlus,
  FaUser,
  FaComments
} from "react-icons/fa";
import { toast } from "react-toastify";

// ✅ Validation schemas
const loginValidationSchema = Yup.object()
  .shape({
    phoneNumber: Yup.string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must contain only digits")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),

    email: Yup.string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email address")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),
  })
  .test(
    "at-least-one",
    "Either phone number or email is required",
    (value) => !!(value.phoneNumber || value.email)
  );

const otpValidationSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, "OTP must be exactly 6 digits")
    .required("OTP is required"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
   "https://api.dicebear.com/6.x/avataaars/svg?seed=Nova",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Kai",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Riley",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Blaze",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aria",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Theo",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Skye",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Ivy",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Phoenix"
];

const Login = () => {
  const navigate = useNavigate();
  const {
    step,
    setStep,
    setUserPhoneData,
    userPhoneData,
    resetLoginState,
    sendOtp,
    verifyOtp,
    updateProfile,
  } = useLoginStore();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();

  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // 🔹 React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  // 🔹 Filter countries
  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  // 🔹 Handle country select
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  // 🔹 Send OTP
  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      const { phoneNumber, email } = data;

      let response;
      if (email) {
        response = await sendOtp(null, null, email);
        if (response.status === "success") {
          toast.info("OTP sent to your Email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        response = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (response.status === "success") {
          toast.info("OTP sent to your Phone");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Verify OTP
  const onOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!userPhoneData) throw new Error("Missing user data");

      const otpString = otp.join("");
      let response;

      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, otpString, userPhoneData.email);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          otpString
        );
      }

      if (response.status === "success") {
        toast.success("OTP Verified Successfully");

        console.log("OTP Verification Response:", response);
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back to WhatsApp!");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3); // go to profile setup
        }
      } else {
        toast.error("Invalid OTP");
      }
    } catch (err) {
      console.error("OTP Error:", err);
      toast.error(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };
// 🔹 Handle OTP Change
const handleOtpChange = (index, value) => {
  if (/^\d*$/.test(value)) {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input automatically
    if (value && index < otp.length - 1) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  }
};

// 🔹 Handle Backspace + Arrow Navigation
const handleOtpKeyDown = (e, index) => {
  if (e.key === "Backspace") {
    if (otp[index]) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    } else if (index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  }

  if (e.key === "ArrowLeft" && index > 0) {
    document.getElementById(`otp-${index - 1}`).focus();
  }

  if (e.key === "ArrowRight" && index < otp.length - 1) {
    document.getElementById(`otp-${index + 1}`).focus();
  }
};

// 🔹 Handle OTP Paste (auto-fill all boxes)
const handleOtpPaste = (e) => {
  e.preventDefault();
  const pasteData = e.clipboardData.getData("text").trim();
  if (/^\d+$/.test(pasteData)) {
    const digits = pasteData.slice(0, otp.length).split("");
    const newOtp = [...otp];
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    setOtp(newOtp);

    // Move focus to last filled box
    const lastIndex = Math.min(digits.length - 1, otp.length - 1);
    document.getElementById(`otp-${lastIndex}`).focus();
  }
};


  // 🔹 Profile picture change
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setPreviewImage(URL.createObjectURL(file));
      setSelectedAvatar(null);
    }
  };

  // 🔹 Update profile
  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      await updateProfile(formData);
      toast.success("Profile Updated! Welcome to WhatsApp!");
      navigate("/");
      resetLoginState();
    } catch (err) {
      console.error("Profile Update Error:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Progress bar
  const ProgressBar = ({ step, theme }) => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
        >
          <FaComments className="w-14 h-14 text-white drop-shadow-lg" />
        </motion.div>

        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
         BuddyChat Login
        </h1>

        <ProgressBar step={step} theme={theme} />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* STEP 1: Phone / Email */}
        {step === 1 && (
          <form className="space-y-4" onSubmit={handleSubmit(onLoginSubmit)}>
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Enter your phone number or email to receive OTP
            </p>

            {/* 📱 Country Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-36">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.dialCode}</span>
                  </span>
                  <FaChevronDown
                    className={`transition-transform duration-200 ${
                      showDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute z-20 w-full mt-2 rounded-xl shadow-lg border overflow-hidden ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="sticky top-0 px-3 py-2 border-b">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          onClick={() => handleCountrySelect(country)}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                          <span className="text-green-500">
                            {country.dialCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <input
                type="tel"
                placeholder="Phone Number"
                {...register("phoneNumber")}
                className="flex-1 border rounded-lg px-3 py-2 outline-none"
              />
            </div>

            {/* OR Email */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span>or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            <input
              type="email"
              placeholder="Email (optional)"
              {...register("email")}
              className="w-full border rounded-lg px-3 py-2 outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md flex justify-center items-center"
            >
              {loading ? <FaSpinner className="animate-spin" /> : "Send OTP"}
            </button>
          </form>
        )}

        {/* STEP 2: OTP and verify-otp */}
        {step === 2 && (
          <form onSubmit={onOtpSubmit} className="space-y-6">
            <h2 className="text-center mb-4">
              Enter OTP sent to{" "}
              {userPhoneData?.email
                ? userPhoneData.email
                : `${userPhoneData?.phoneSuffix || ""} ${
                    userPhoneData?.phoneNumber || ""
                  }`}
            </h2>

            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={(e) => handleOtpPaste(e)}
                  className="w-10 h-10 text-center border rounded-md text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md flex justify-center items-center"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
            >
              <FaArrowLeft /> Wrong details? Go Back
            </button>
          </form>
        )}

        {/* STEP 3: Profile Setup */}

        {step === 3 && (
          <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                {/* ✅ Profile Preview (file or avatar) */}
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile Preview"
                    className="w-full h-full rounded-full object-cover border-2 border-green-500"
                  />
                ) : selectedAvatar ? (
                  <img
                    src={selectedAvatar}
                    alt="Selected Avatar"
                    className="w-full h-full rounded-full object-cover border-2 border-green-500"
                  />
                ) : (
                  <div className="w-full h-full rounded-full border-2 border-dashed flex items-center justify-center text-gray-400 text-3xl">
                    <FaUser />
                  </div>
                )}

                {/* ✅ File Upload Button */}
                <label
                  htmlFor="Profile-Picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition duration-300"
                >
                  <FaPlus className="w-4 h-4" />
                </label>

                <input
                  type="file"
                  id="Profile-Picture"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>

              {/* Avatar section */}
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                } mb-2`}
              >
                Choose an Avatar
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${
                      selectedAvatar === avatar ? "ring-2 ring-green-500" : ""
                    }`}
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      setProfilePictureFile(null);
                      setPreviewImage(null);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Username input */}
            <div className="relative">
              <FaUser
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-800"
                }`}
              />

              <input
                {...register("username")}
                type="text"
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-800"
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-300`}
              />

              {profileErrors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {profileErrors.username.message}
                </p>
              )}
            </div>

            {/* Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                id="terms"
                {...register("agreed")}
                type="checkbox"
                className={`rounded ${
                  theme === "dark"
                    ? "text-green-500 bg-gray-700"
                    : "text-green-500"
                } focus:ring-green-500`}
              />
              <label
                htmlFor="terms"
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                I agree to the{" "}
                <a href="#" className="text-red-500 hover:underline">
                  Terms and Conditions
                </a>
              </label>
            </div>

            {profileErrors.agreed && (
              <p className="text-red-500 text-sm mt-1">
                {profileErrors.agreed.message}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!watch("agreed") || loading}
              className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center text-lg 
        ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                "Create Profile"
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
