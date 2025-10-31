import React from "react";
import { motion } from "framer-motion";
import { FaComments } from "react-icons/fa";

export default function Loader({ progress = 0 }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 text-white z-50 overflow-hidden">
      {/* Floating background pulse effect */}
      <motion.div
        className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Icon with pulse */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 250,
          damping: 15,
        }}
        className="relative z-10 bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <FaComments className="w-14 h-14 text-white drop-shadow-lg" />
        </motion.div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-56 bg-white/20 rounded-full h-2 mt-10 overflow-hidden">
        <motion.div
          className="bg-white h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* Progress text */}
      <motion.p
        key={progress}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 text-lg font-semibold tracking-wide text-white/90"
      >
        {progress < 100 ? `Loading ${progress}%...` : "Almost Ready!"}
      </motion.p>
    </div>
  );
}
