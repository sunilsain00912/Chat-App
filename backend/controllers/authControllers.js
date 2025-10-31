const User = require("../models/User");
const otpGenerate = require("../utils/otpGenerater");
const response = require("../utils/responseHandler");
const sendOtpToEmail = require("../services/emailService");
const tiwilioService = require("../services/twilioServices");
const generateToken = require("../utils/generateToken");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const conversation = require("../models/Conversation");
const Conversation = require("../models/Conversation");

console.log("Response check:", typeof response);

// Step-1 Send Otp
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
  let user;

  try {
    // If email is provided — send OTP via email
    if (email) {
      user = await User.findOne({ email });

      if (!user) {
        user = new User({ email });
      }

      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();

      await sendOtpToEmail(email, otp);
      return response(res, 200, "OTP sent to your email ✅", { email });
    }

    // If phone is provided — send OTP via Twilio
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and phone suffix are required");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber: fullPhoneNumber });

    if (!user) {
      user = new User({ phoneNumber: fullPhoneNumber, phoneSuffix });
    }

    await tiwilioService.sendOtpToPhoneNumber(fullPhoneNumber);
    await user.save();

    return response(res, 200, "OTP sent successfully ✅", user);
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return response(res, 500, "developer can login with phone number u can login with gmail 😂");
  }
};

// Step-2 Verify Otp
const verifyOtp = async (req, res) => {
  const { email, otp, phoneNumber, phoneSuffix } = req.body;
  let user;

  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) return response(res, 404, "User not found ❌");

      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired OTP");
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix)
        return response(res, 400, "Phone number and phone suffix are required");

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber: fullPhoneNumber }); // ✅ fixed

      if (!user) return response(res, 404, "User not found ❌");

      const result = await tiwilioService.verifyOtp(fullPhoneNumber, otp);
      if (result.status !== "approved")
        return response(res, 400, "Invalid OTP");

      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false, // ✅ required for HTTPS or Chrome
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ allow cross-origin cookies
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    return response(res, 200, "OTP verified successfully ✅", { token, user });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return response(res, 404, "User not found ❌");

    const file = req.file;

    // ✅ upload to Cloudinary if file exists
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    // ✅ update optional fields
    if (username) user.username = username;
    if (typeof agreed !== "undefined") user.agreed = agreed;
    if (about) user.about = about;

    await user.save();

    return response(res, 200, "User profile updated successfully ✅", user);
  } catch (error) {
    console.error("updateProfile error:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

module.exports = { updateProfile };

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(
        res,
        404,
        "unauthorization ! please login before access our app"
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "user not found");
    }
    return response(res, 200, "user retrived and allow to use whatsapp", user);
  } catch (error) {
    return response(res, 500, "Internal server error ❌");
  }
};

const logout = (req, res) => {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
      path: "/",
    });

    return response(res, 200, "User logged out successfully ✅");
  } catch (error) {
    console.error("Logout error:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        "username profilePicture lastseen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    const userWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createAt sender receiver",
          })
          .lean();
        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );
    return response(
      res,
      200,
      "user retrived sucessfully ✅",
      userWithConversation
    );
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error ❌");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
