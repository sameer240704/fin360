"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";
import { useUser } from "@clerk/nextjs";
import { Input } from "../ui/input";
import { IoIosSend } from "react-icons/io";
import { RiAttachment2 } from "react-icons/ri";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import Image from "next/image";
import { Logo } from "@/public/images";
import { BsThreeDotsVertical, BsSearch } from "react-icons/bs";
import {
  getAllChatMessages,
  uploadChatMessage,
} from "@/lib/actions/chat.action";
import { format } from "date-fns";
import { Skeleton } from "../ui/skeleton";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_SERVER_URL } from "@/constants/utils";

const ChatComponent = ({ messages, setMessages }) => {
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useUser();

  const currentUserId = user?.publicMetadata?.userId;
  const currentUserName = user?.username || user?.firstName || "You";

  useEffect(() => {
    async function fetchChats() {
      setIsLoading(true);
      try {
        const response = await getAllChatMessages();

        if (response.success && response.data) {
          const formattedMessages = [];

          response.data.forEach((chat) => {
            const userMessage = {
              _id: `user-${chat._id}`,
              senderId: chat.userId,
              senderName: "You",
              message: chat.userMessage,
              createdAt: new Date(chat.createdAt),
            };

            const assistantMessage = {
              _id: `assistant-${chat._id}`,
              senderId: "assistant",
              senderName: "Fin360.ai",
              message: chat.botResponse,
              createdAt: new Date(chat.createdAt),
            };

            formattedMessages.push(userMessage, assistantMessage);
          });

          formattedMessages.sort((a, b) => a.createdAt - b.createdAt);

          setMessages(formattedMessages);
        } else {
          setError(response.error || "Failed to load messages");
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        setError("Something went wrong. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchChats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!currentUserId) {
      toast.error("User not authenticated");
      return;
    }

    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      senderId: currentUserId,
      senderName: currentUserName,
      message: newMessage,
      createdAt: new Date(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    const chatData = {
      prompt: newMessage,
      model_options: {
        model_name: selectedModel,
        temperature: 0.5,
        top_p: 0.95,
        max_tokens: 2048,
        context_window: 3,
      },
    };

    try {
      const response = await fetch(`${AI_SERVER_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to the backend.");
      }

      const data = await response.json();

      const assistantMessage = {
        _id: Date.now().toString(),
        senderId: "assistant",
        senderName: "Fin360.ai",
        message: data.response,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const uploadResult = await uploadChatMessage({
          userId: currentUserId,
          userMessage: newMessage,
          botResponse: data.response,
          intent: data.intent || null,
          confidence: data.confidence || null,
        });

        if (!uploadResult.success) {
          toast.error(
            "Failed to upload conversation to database",
            uploadResult.error
          );
        }
      } catch (uploadError) {
        console.error("Error uploading assistant response:", uploadError);
      }
    } catch (error) {
      console.error("Failed to send message", error);

      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setError("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (date) => {
    return format(new Date(date), "h:mm a");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full md:w-1/3 w-full bg-white dark:bg-dark-secondary-500 border-2 border-primary-100 dark:border-dark-secondary-300 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="px-4 py-3 flex justify-between items-center font-semibold text-base bg-gradient-to-r from-primary-100 to-primary-200 dark:from-dark-primary-800 dark:to-dark-primary-900 text-primary-900 dark:text-dark-primary-100">
        <div className="flex items-center gap-2">
          <Image src={Logo} alt="Logo" className="h-8 w-auto" />
          <span>Fin360.ai</span>
        </div>
        <span className="flex items-center gap-3">
          <BsSearch className="h-5 w-auto cursor-pointer hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors" />
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-32 h-10">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              <SelectItem value="llama3-8b-8192">Llama 3 8B</SelectItem>
            </SelectContent>
          </Select>
          <BsThreeDotsVertical className="h-5 w-auto cursor-pointer hover:text-primary-600 dark:hover:text-dark-primary-400 transition-colors" />
        </span>
      </div>

      <div
        className="bg-gradient-to-br from-secondary-200 to-secondary-100 dark:from-dark-secondary-400 dark:to-dark-secondary-500 flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-opacity-30"
        style={{
          backgroundImage:
            "url('https://www.transparenttextures.com/patterns/cubes.png')",
          backgroundBlendMode: "overlay",
        }}
      >
        {isLoading ? (
          [...Array(5)].map((_, index) => (
            <div
              key={index}
              className={`flex items-start space-x-2 ${
                index % 2 === 0 ? "" : "flex-row-reverse space-x-reverse"
              }`}
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton
                  className={`h-12 ${index % 2 === 0 ? "w-56" : "w-72"}`}
                />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isCurrentUser = msg.senderId === currentUserId;
              const showAvatar =
                index === 0 || messages[index - 1].senderId !== msg.senderId;
              const showName = showAvatar;

              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start space-x-2 ${
                    isCurrentUser ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {showAvatar ? (
                    <FaUserCircle
                      className={`h-10 w-10 flex-shrink-0 ${
                        isCurrentUser
                          ? "text-primary-500 dark:text-dark-primary-500"
                          : "text-secondary-100 dark:text-white"
                      }`}
                    />
                  ) : (
                    <div className="w-10 flex-shrink-0" />
                  )}
                  <div className="space-y-1 max-w-[75%]">
                    {showName && (
                      <div
                        className={`text-xs font-semibold ${
                          isCurrentUser
                            ? "text-right text-primary-600 dark:text-dark-primary-400"
                            : "text-secondary-800 dark:text-white"
                        }`}
                      >
                        {msg.senderName}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3 rounded-2xl shadow-sm ${
                          isCurrentUser
                            ? "bg-primary-500 text-white rounded-tr-none"
                            : "bg-white dark:bg-white/80 text-secondary-900 dark:text-dark-secondary-900 rounded-tl-none"
                        } ${msg.isOptimistic ? "opacity-90" : ""}`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                      </motion.div>
                      <span className="text-xs text-secondary-700 dark:text-dark-secondary-300 hidden lg:block">
                        {msg.createdAt && formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-dark-secondary-400 border-t border-secondary-300 dark:border-dark-secondary-300 flex items-center gap-2">
        <div className="flex-shrink-0 flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-secondary-600 dark:text-dark-secondary-100 hover:text-primary-500 dark:hover:text-dark-primary-500 rounded-full hover:bg-primary-100 dark:hover:bg-dark-primary-900 transition-colors"
          >
            <MdOutlineEmojiEmotions className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-secondary-600 dark:text-dark-secondary-100 hover:text-primary-500 dark:hover:text-dark-primary-500 rounded-full hover:bg-primary-100 dark:hover:bg-dark-primary-900 transition-colors"
          >
            <RiAttachment2 className="h-5 w-5" />
          </motion.button>
        </div>

        <Input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          className="h-10 flex-1 p-3 bg-secondary-100 dark:bg-dark-secondary-300 text-secondary-900 dark:text-white border border-secondary-300 dark:border-dark-secondary-500 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-dark-primary-600"
          placeholder="Type a message..."
        />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className={`p-2.5 rounded-full ${
            newMessage.trim()
              ? "bg-primary-500 dark:bg-dark-primary-500 text-white"
              : "bg-secondary-300 dark:bg-dark-secondary-600 text-secondary-500 dark:text-dark-secondary-300 cursor-not-allowed"
          } transition-colors`}
        >
          <IoIosSend className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatComponent;
