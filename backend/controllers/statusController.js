const mongoose = require("mongoose");
const Status = require("../models/Status");
const response = require("../utils/responseHandler");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

// 📩 Create / Upload Status
exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    // 📤 Handle file upload (if any)
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media ❌");
      }

      mediaUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type ❌");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required ❌");
    }

    // ⏳ Expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // ✅ correct

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });

    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    // 🛰️ Emit socket event (notify all other users)
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(
      res,
      201,
      "Status uploaded successfully ✅",
      populatedStatus
    );
  } catch (error) {
    console.error("❌ Error uploading Status:", error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 📦 Get All Active Statuses
exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }, // Only fetch active (non-expired) statuses
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses retrieved successfully ✅", statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error ❌");
  }
};

// 👀 View a Specific Status
exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found ❌");
    }

    // Add viewer if not already present
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      // 🛰️ Emit socket event to status owner
      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user.toString()
        );

        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };

          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("status owner not connected");
        }
      }
    } else {
      console.log("user already viewed the status");
    }

    return response(res, 200, "Status viewed successfully ✅");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Error viewing status ❌");
  }
};

// ❌ Delete Status
exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found ❌");
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status ❌");
    }

    await status.deleteOne();

    // 🛰️ Emit socket event to others
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "Status deleted successfully ✅");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error ❌");
  }
};
