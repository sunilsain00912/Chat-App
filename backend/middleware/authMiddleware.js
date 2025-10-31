const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler");

const authMiddleware = (req, res, next) => {
  try {
    // 🔐 Token can come from cookie or Authorization header
    const authToken =
      req.cookies?.auth_token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return response(
        res,
        401,
        "Authorization token is missing. Please provide a valid token ❌"
      );
    }

    // 🔍 Verify token
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    return response(res, 401, "Invalid or expired token ❌");
  }
};

module.exports = authMiddleware;
