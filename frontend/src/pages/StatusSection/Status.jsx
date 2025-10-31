// src/pages/Status.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/chatStore";
import api from "../../Services/url.Service";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaRegImage,
  FaTimes,
  FaEye,
  FaTrash,
  FaCamera,
} from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const STATUS_AUTO_ADVANCE_MS = 5000;
const PROGRESS_TICK_MS = 50;

const Status = () => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { socket } = useChatStore();

  // backend data
  const [statuses, setStatuses] = useState([]); // raw statuses list
  const [flatStatuses, setFlatStatuses] = useState([]); // flattened [{ user, status }]
  const [loading, setLoading] = useState(false);

  // upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // index in flatStatuses
  const [progress, setProgress] = useState(0); // 0..100 (for current segment)
  const [paused, setPaused] = useState(false);

  // viewer list bottom-sheet (for owner's status)
  const [viewerListOpen, setViewerListOpen] = useState(false);
  const [viewerList, setViewerList] = useState([]); // array of { _id, username, profilePicture, viewedAt? }

  const progressIntervalRef = useRef(null);
  const videoRef = useRef(null);

  const navigate = useNavigate();

  // group helper
  const groupByUser = useCallback((list) => {
    const map = new Map();
    (list || []).forEach((s) => {
      const uid = s.user._id || s.user;
      if (!map.has(uid)) map.set(uid, { user: s.user, statuses: [] });
      map.get(uid).statuses.push(s);
    });
    return Array.from(map.values());
  }, []);

  // fetch statuses
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/status");
      const data = res?.data?.data ?? res?.data ?? [];
      const active = data.filter((s) => new Date(s.expiresAt) > new Date());
      setStatuses(active);
      const flat = active
        .map((s) => ({ user: s.user, status: s }))
        .sort(
          (a, b) => new Date(b.status.createdAt) - new Date(a.status.createdAt)
        );
      setFlatStatuses(flat);
    } catch (err) {
      console.error("fetchStatuses:", err);
      toast.error("Failed to load statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // socket updates (new, deleted, viewed)
  useEffect(() => {
    if (!socket) return;
    const onNew = (status) => {
      setStatuses((p) => [status, ...p.filter((s) => s._id !== status._id)]);
      setFlatStatuses((p) => [{ user: status.user, status }, ...p]);
    };
    const onDeleted = (statusId) => {
      setStatuses((p) => p.filter((s) => s._id !== statusId));
      setFlatStatuses((p) => p.filter((f) => f.status._id !== statusId));
      // if viewer open on deleted status, advance
      if (viewerOpen && flatStatuses[activeIndex]?.status?._id === statusId) {
        handleNext();
      }
    };
    const onViewed = (viewData) => {
      // viewData: { statusId, viewers } (we expect array of users)
      setStatuses((p) =>
        p.map((s) =>
          s._id === viewData.statusId ? { ...s, viewers: viewData.viewers } : s
        )
      );
      setFlatStatuses((p) =>
        p.map((f) =>
          f.status._id === viewData.statusId
            ? { ...f, status: { ...f.status, viewers: viewData.viewers } }
            : f
        )
      );
    };

    socket.on("new_status", onNew);
    socket.on("status_deleted", onDeleted);
    socket.on("status_viewed", onViewed);

    return () => {
      socket.off("new_status", onNew);
      socket.off("status_deleted", onDeleted);
      socket.off("status_viewed", onViewed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, viewerOpen, activeIndex, flatStatuses]);

  // ----- Upload handlers -----
  const onUploadFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
  };

  const clearUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadText("");
    setUploadProgress(0);
  };

  const submitUpload = async () => {
    if (!uploadText.trim() && !uploadFile) {
      toast.error("Add text or media for status");
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      if (uploadFile) {
        form.append("media", uploadFile);
        form.append(
          "contentType",
          uploadFile.type.startsWith("video") ? "video" : "image"
        );
      } else {
        form.append("contentType", "text");
      }
      form.append("content", uploadFile ? "" : uploadText.trim());

      const res = await api.post("/status", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total)
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const created = res?.data?.data ?? res?.data;
      if (created) {
        setStatuses((p) => [created, ...p]);
        setFlatStatuses((p) => [{ user: created.user, status: created }, ...p]);
        toast.success("Status uploaded");
        clearUpload();
        setUploadOpen(false);
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      console.error("submitUpload:", err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ----- Viewer logic -----
  // Mark viewed
  // ----- Viewer logic -----
  const markViewed = async (statusId) => {
    try {
      // Find the status being viewed
      const target = flatStatuses.find((f) => f.status._id === statusId);
      if (!target) return;

      // Get current logged-in user ID
      const currentUserId = user?._id;
      const ownerId = target.status.user?._id;

      // 🧩 Skip marking view if the user is viewing their own status
      if (currentUserId === ownerId) {
        console.log("👀 Skipping self-view — owner cannot increase view count");
        return;
      }

      // Proceed to mark as viewed for others
      const res = await api.put(`/status/${statusId}/view`);
      const data = res?.data?.data ?? res?.data;

      // Update local states if viewers list changed
      if (data?.viewers) {
        setStatuses((prev) =>
          prev.map((s) =>
            s._id === statusId ? { ...s, viewers: data.viewers } : s
          )
        );

        setFlatStatuses((prev) =>
          prev.map((f) =>
            f.status._id === statusId
              ? { ...f, status: { ...f.status, viewers: data.viewers } }
              : f
          )
        );
      }
    } catch (err) {
      console.error("❌ markViewed error:", err);
    }
  };

  const openViewerAt = (index) => {
    if (index < 0 || index >= flatStatuses.length) return;
    setActiveIndex(index);
    setViewerOpen(true);
    setProgress(0);
    setPaused(false);
    markViewed(flatStatuses[index].status._id);
  };

  // top progress auto-advance (respects paused)
  useEffect(() => {
    if (!viewerOpen) {
      clearInterval(progressIntervalRef.current);
      setProgress(0);
      return;
    }

    // reset progress
    setProgress(0);
    clearInterval(progressIntervalRef.current);

    if (paused) return; // do not start when paused

    const step = (PROGRESS_TICK_MS / STATUS_AUTO_ADVANCE_MS) * 100;
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= 100) {
          clearInterval(progressIntervalRef.current);
          setTimeout(() => handleNext(), 250);
          return 100;
        }
        return next;
      });
    }, PROGRESS_TICK_MS);

    return () => clearInterval(progressIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOpen, activeIndex, paused]);

  const handleNext = () => {
    const next = activeIndex + 1;
    if (next >= flatStatuses.length) {
      setViewerOpen(false);
      setActiveIndex(0);
      setProgress(0);
      return;
    }
    setActiveIndex(next);
    setProgress(0);
    markViewed(flatStatuses[next].status._id);
  };

  const handlePrev = () => {
    const prev = activeIndex - 1;
    if (prev < 0) return;
    setActiveIndex(prev);
    setProgress(0);
    markViewed(flatStatuses[prev].status._id);
  };

  // toggle pause/resume (tap anywhere)
  const togglePause = () => {
    setPaused((p) => {
      const newState = !p;
      // video control
      if (videoRef.current) {
        try {
          if (newState) videoRef.current.pause();
          else videoRef.current.play();
        } catch (e) {
          // ignore
        }
      }
      return newState;
    });
  };

  // delete status (only owner)
  const handleDelete = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      setStatuses((p) => p.filter((s) => s._id !== statusId));
      setFlatStatuses((p) => p.filter((f) => f.status._id !== statusId));
      toast.success("Status deleted");
      if (viewerOpen && flatStatuses[activeIndex]?.status._id === statusId) {
        handleNext();
      }
    } catch (err) {
      console.error("handleDelete:", err);
      toast.error("Delete failed");
    }
  };

  // helper: has current user viewed? (for ring)
  const hasUnseenByUser = (group) => {
    const uid = user?._id;
    return group.statuses.some(
      (s) => !s.viewers?.some((v) => String(v._id ?? v) === String(uid))
    );
  };

  // Build grouped list and firstIndex mapping
  const grouped = groupByUser(statuses);
  const firstIndexOfUser = useRef(new Map());
  useEffect(() => {
    const map = new Map();
    flatStatuses.forEach((f, idx) => {
      const uid = f.user._id || f.user;
      if (!map.has(uid)) map.set(uid, idx);
    });
    firstIndexOfUser.current = map;
  }, [flatStatuses]);

  // cleanup preview url
  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  // UI helpers
  const myGroup = grouped.find((g) => String(g.user._id) === String(user?._id));
  const otherGroups = grouped.filter(
    (g) => String(g.user._id) !== String(user?._id)
  );

  // open viewer list bottom sheet for owner's status
  const openViewerList = (status) => {
    const viewers = status?.viewers ?? [];

    const normalized = viewers.map((v) => {
      if (!v) return { _id: null, username: "Unknown", profilePicture: null };
      if (typeof v === "string" || typeof v === "number") {
        return {
          _id: v,
          username: String(v).slice(0, 8),
          profilePicture: null,
        };
      }
      // If v has username/profilePicture, use them
      return {
        _id: v._id ?? v.id ?? null,
        username: v.username ?? v.name ?? String(v._id ?? "").slice(0, 8),
        profilePicture: v.profilePicture ?? v.avatar ?? null,
        viewedAt: v.viewedAt ?? v.viewedAtTime ?? null, // optional if backend provides
      };
    });
    setViewerList(normalized);
    setViewerListOpen(true);
  };

  // keyboard ESC to close viewer / bottom sheet
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (viewerListOpen) setViewerListOpen(false);
        else if (viewerOpen) setViewerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewerListOpen, viewerOpen]);

  // --- New helpers for WhatsApp-style segmented progress bars ---
  const getCurrentGroupStatuses = () => {
    if (!flatStatuses[activeIndex]) return [];
    const currUser = flatStatuses[activeIndex].user;
    if (!currUser) return [];
    return flatStatuses
      .map((f) => ({ user: f.user, status: f.status }))
      .filter((f) => String(f.user._id) === String(currUser._id))
      .map((f) => f.status);
  };

  const getIndexInCurrentGroup = () => {
    const group = getCurrentGroupStatuses();
    const currentStatusId = flatStatuses[activeIndex]?.status?._id;
    return group.findIndex((s) => s._id === currentStatusId);
  };

  // render
  return (
    <div
      className={`min-h-screen py-6 px-3 ${
        theme === "dark"
          ? "bg-[#0b1416] text-white"
          : "bg-gray-100 text-gray-900"
      }`}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="fixed top-3 left-3 z-50 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
          title="Back"
        >
          <FaArrowLeft size={16} />
        </button>

        {/* Card container styled like WhatsApp */}
        <div
          className={`mt-6 rounded-xl overflow-hidden shadow-sm ${
            theme === "dark" ? "bg-[#071010]/60" : "bg-white"
          }`}
        >
          {/* Header area - My Status */}
          <div
            className={`flex items-center gap-3 px-4 py-3 border-b ${
              theme === "dark" ? "border-white/8" : "border-gray-200"
            }`}
          >
            <div
              className="relative w-16 h-16 rounded-full flex-shrink-0 cursor-pointer"
              onClick={() => {
                if (myGroup) {
                  const idx = firstIndexOfUser.current.get(String(user._id));
                  if (typeof idx === "number") openViewerAt(idx);
                } else {
                  setUploadOpen(true);
                }
              }}
            >
              <div
                className={`w-full h-full p-[3px] rounded-full ${
                  myGroup
                    ? "bg-green-500"
                    : "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-400"
                }`}
              >
                <div className="w-full h-full rounded-full bg-white overflow-hidden">
                  {myGroup ? (
                    <img
                      src={
                        user?.profilePicture ||
                        `https://ui-avatars.com/api/?name=${user?.username}`
                      }
                      alt="your story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                        alt="add story placeholder"
                        className="w-10 h-10 opacity-80"
                      />
                    </div>
                  )}
                </div>
              </div>

              <label
                htmlFor="uploadModalInput"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadOpen(true);
                }}
                className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-pink-500 to-yellow-400 text-white rounded-full p-[6px] border-2 border-white shadow-md cursor-pointer"
                title="Add status"
              >
                <FaPlus size={12} />
              </label>
            </div>

            <div className="flex-1">
              <div className="text-sm font-medium">
                {user?.username || "You"}
              </div>
              <div className="text-xs text-gray-400">
                {myGroup
                  ? `${myGroup.statuses.length} update${
                      myGroup.statuses.length > 1 ? "s" : ""
                    }`
                  : "No updates"}
              </div>
            </div>
            <div className="text-xs text-gray-400">Tap to add</div>
          </div>

          {/* Viewed updates header */}
          <div className="px-4 py-3 text-xs font-semibold text-gray-400 border-b">
            Viewed updates
          </div>

          {/* Contact list (WhatsApp style) */}
          <div className="divide-y">
            {loading ? (
              <div className="p-4 text-sm text-gray-400">
                Loading statuses...
              </div>
            ) : otherGroups.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">No viewed updates</div>
            ) : (
              otherGroups.map((g) => {
                const uid = g.user._id;
                const firstIdx = firstIndexOfUser.current.get(String(uid)) ?? 0;
                const unseen = hasUnseenByUser(g);
                // show most recent timestamp from that group
                const latestTime = g.statuses
                  .map((s) => new Date(s.createdAt))
                  .sort((a, b) => b - a)[0];
                return (
                  <div
                    key={uid}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 ${
                      theme === "dark" ? "hover:bg-white/2" : "hover:bg-gray-50"
                    }`}
                    onClick={() => openViewerAt(firstIdx)}
                  >
                    <div
                      className={`w-14 h-14 rounded-full p-[2px] flex-shrink-0 ${
                        unseen
                          ? "bg-gradient-to-tr from-yellow-400 to-pink-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <img
                        src={
                          g.user.profilePicture ||
                          `https://ui-avatars.com/api/?name=${g.user.username}`
                        }
                        alt={g.user.username}
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="font-medium truncate">
                          {g.user.username}
                        </div>
                        <div className="text-xs text-gray-400">
                          {latestTime ? latestTime.toLocaleTimeString() : ""}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        {g.statuses[0]?.contentType === "text"
                          ? g.statuses[0].content.slice(0, 60)
                          : g.statuses[0]?.contentType === "image"
                          ? "Photo"
                          : g.statuses[0]?.contentType === "video"
                          ? "Video"
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* small footer instruction */}
        <div className="mt-4 text-xs text-gray-400 px-2">
          Tap a status to view. Tap and hold to pause (or tap to pause/play on
          video).
        </div>
      </div>

      {/* ---------- Upload Modal (WhatsApp style) ---------- */}
      <AnimatePresence>
        {uploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
          >
            <div
              className={`w-full max-w-md mx-4 rounded-xl p-4 ${
                theme === "dark"
                  ? "bg-[#152a2b] text-white"
                  : "bg-white text-gray-900"
              } shadow-xl`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      user?.profilePicture ||
                      `https://ui-avatars.com/api/?name=${user?.username}`
                    }
                    alt="me"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{user?.username}</div>
                    <div className="text-xs text-gray-400">
                      Add to your status
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadOpen(false);
                    clearUpload();
                  }}
                  className="text-gray-400"
                >
                  <FaTimes />
                </button>
              </div>

              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Write a short status (optional)"
                rows={3}
                className={`w-full p-3 rounded-md ${
                  theme === "dark"
                    ? "bg-[#0f2627] text-white"
                    : "bg-gray-50 text-gray-900"
                } outline-none`}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="uploadModalInput"
                    className="flex items-center gap-2 cursor-pointer text-blue-600"
                  >
                    <FaRegImage /> <span className="text-sm">Photo/Video</span>
                  </label>
                  <input
                    id="uploadModalInput"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={onUploadFileChange}
                  />
                  {uploadPreview && (
                    <button
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {uploading && (
                    <div className="text-sm">{uploadProgress}%</div>
                  )}
                  <button
                    onClick={() => {
                      setUploadOpen(false);
                      clearUpload();
                    }}
                    className="px-3 py-1 rounded-md bg-gray-300 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitUpload}
                    disabled={uploading}
                    className="px-3 py-1 rounded-md bg-green-600 text-white"
                  >
                    {uploading ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {uploadPreview && (
                <div className="mt-3">
                  {uploadFile?.type?.startsWith("video") ? (
                    <video
                      src={uploadPreview}
                      controls
                      className="w-full rounded-md max-h-64 object-contain"
                    />
                  ) : (
                    <img
                      src={uploadPreview}
                      alt="preview"
                      className="w-full rounded-md max-h-64 object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Fullscreen Viewer (WhatsApp story style) ---------- */}
      <AnimatePresence>
        {viewerOpen && flatStatuses[activeIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 flex items-center justify-center bg-black/95"
          >
            {/* Top header with segmented progress bars + user info */}
            <div className="absolute top-4 left-3 right-3 z-80">
              {/* segmented bars */}
              <div className="flex gap-2 items-center mb-3 px-1">
                {getCurrentGroupStatuses().map((s, idx) => {
                  const groupIndex = getIndexInCurrentGroup();
                  let pct = 0;
                  if (idx < groupIndex) pct = 100;
                  else if (idx === groupIndex) pct = progress;
                  else pct = 0;
                  return (
                    <div key={s._id} className="flex-1 h-1 bg-white/25 rounded">
                      <div
                        className="h-1 bg-white rounded"
                        style={{
                          width: `${pct}%`,
                          transition: "width 0.05s linear",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      flatStatuses[activeIndex].user.profilePicture ||
                      `https://ui-avatars.com/api/?name=${flatStatuses[activeIndex].user.username}`
                    }
                    alt="pp"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-white font-medium">
                      {flatStatuses[activeIndex].user.username}
                    </div>
                    <div className="text-xs text-white/70">
                      {new Date(
                        flatStatuses[activeIndex].status.createdAt
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {String(flatStatuses[activeIndex].user._id) ===
                  String(user?._id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewerList(flatStatuses[activeIndex].status);
                      }}
                      className="flex items-center gap-2 text-white/90"
                      title="Viewers"
                    >
                      <FaEye />{" "}
                      <span className="text-sm">
                        {flatStatuses[activeIndex].status.viewers?.length ?? 0}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-white/70">
                      <FaEye />{" "}
                      <span className="text-sm">
                        {flatStatuses[activeIndex].status.viewers?.length ?? 0}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setViewerOpen(false);
                      setPaused(false);
                      setProgress(0);
                    }}
                    className="text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>

            {/* content area - tap to pause/play */}
            <div
              className="w-full h-full flex items-center justify-center px-4"
              onClick={() => togglePause()}
            >
              <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
                <motion.div
                  key={flatStatuses[activeIndex].status._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {flatStatuses[activeIndex].status.contentType === "image" && (
                    <img
                      src={flatStatuses[activeIndex].status.content}
                      alt="status"
                      className="max-h-[80vh] w-auto object-contain rounded-md"
                      draggable={false}
                    />
                  )}

                  {flatStatuses[activeIndex].status.contentType === "video" && (
                    <video
                      ref={videoRef}
                      src={flatStatuses[activeIndex].status.content}
                      autoPlay
                      className="max-h-[80vh] w-auto rounded-md"
                    />
                  )}

                  {flatStatuses[activeIndex].status.contentType === "text" && (
                    <div className="p-6">
                      <p className="text-white text-lg text-center whitespace-pre-wrap">
                        {flatStatuses[activeIndex].status.content}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* left/right tap zones */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-50"
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-50"
                />
              </div>

              {/* bottom overlay: time + view count for non-owner + delete for owner */}
              <div className="absolute bottom-6 left-6 text-white text-sm flex items-center gap-4">
                <div>
                  {new Date(
                    flatStatuses[activeIndex].status.createdAt
                  ).toLocaleTimeString()}
                </div>
                {String(flatStatuses[activeIndex].user._id) !==
                  String(user?._id) && (
                  <div className="flex items-center gap-1">
                    {/* <FaEye /> <span>{flatStatuses[activeIndex].status.viewers?.length ?? 0}</span> */}
                  </div>
                )}
                {String(flatStatuses[activeIndex].user._id) ===
                  String(user?._id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(flatStatuses[activeIndex].status._id);
                    }}
                    className="text-red-400"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Viewer List Bottom Sheet (owner only) ---------- */}
      <AnimatePresence>
        {viewerListOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-90 flex items-end justify-center pointer-events-auto"
          >
            {/* backdrop */}
            <div
              onClick={() => setViewerListOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <div
              className={`relative w-full max-w-3xl mx-4 mb-6 rounded-t-xl overflow-hidden ${
                theme === "dark"
                  ? "bg-[#0f2d2d] text-white"
                  : "bg-white text-gray-900"
              } shadow-2xl`}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-medium">Seen by</div>
                </div>
                <button
                  onClick={() => setViewerListOpen(false)}
                  className="text-gray-400"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="max-h-72 overflow-auto">
                {viewerList.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">
                    No viewers yet
                  </div>
                ) : (
                  viewerList.map((v) => (
                    <div
                      key={v._id ?? Math.random()}
                      className="p-3 flex items-center gap-3 border-b border-white/5"
                    >
                      <img
                        src={
                          v.profilePicture ||
                          `https://ui-avatars.com/api/?name=${v.username}`
                        }
                        alt={v.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{v.username}</div>
                        {v.viewedAt ? (
                          <div className="text-xs text-gray-400">
                            {new Date(v.viewedAt).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Status;
