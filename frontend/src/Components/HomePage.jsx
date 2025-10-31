import React, { useState, useEffect } from "react";
import Layout from "./Layout";
import { motion } from "framer-motion";
import ChatList from "../pages/chatSection/ChatList";
import { getAllUsers } from "../Services/user.service";
import { useChatStore } from "../store/chatStore"; 

const HomePage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentConversation, setCurrentConversation } = useChatStore(); // ✅ added

  // 🧹 Clear active chat if user returns to homepage
  useEffect(() => {
    if (currentConversation) {
      setCurrentConversation(null);
    }
  }, []); // ✅ only run once on mount

  const getUser = async () => {
    try {
      const result = await getAllUsers();
      if (result?.status === "success" || Array.isArray(result?.data)) {
        setAllUsers(result.data || []);
      } else {
        console.error("Unexpected API response:", result);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-full flex items-center justify-center"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-gray-300 dark:border-gray-600"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-green-500 animate-spin"></div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="text-gray-500 dark:text-gray-400 text-sm tracking-wide"
            >
              Loading...
            </motion.p>
          </div>
        ) : (
          <ChatList contacts={allUsers} />
        )}
      </motion.div>
    </Layout>
  );
};

export default HomePage;
