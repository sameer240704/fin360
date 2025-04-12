"use server";

import { connect } from "@/lib/mongo.db";
import Chat from "../models/chat.model";
import { Types } from "mongoose";
import { encryptValue, decryptValue } from "../helpers/security.helper";

export async function uploadChatMessage(chatData) {
    const { userId, userMessage, botResponse, intent, confidence } = chatData;
    try {
        await connect();

        const newChat = new Chat({
            userId: new Types.ObjectId(userId),
            userMessage: encryptValue(userMessage),
            botResponse: encryptValue(botResponse),
            intent: intent || null,
            confidence: confidence || null,
        });

        const savedChat = await newChat.save();

        return {
            success: true,
            data: {
                _id: savedChat._id.toString(),
                userId: savedChat.userId.toString(),
                userMessage: decryptValue(savedChat.userMessage),
                botResponse: decryptValue(savedChat.botResponse),
                intent: savedChat.intent,
                confidence: savedChat.confidence,
                createdAt: savedChat.createdAt,
            },
        };
    } catch (error) {
        console.error("Error uploading chat message:", error);
        return {
            success: false,
            error: "Failed to upload chat message",
        };
    }
}

export async function getAllChatMessages() {
    try {
        await connect();

        const allChats = await Chat.find().sort({ createdAt: 1 });

        return {
            success: true,
            data: allChats.map((chat) => ({
                _id: chat._id.toString(),
                userId: chat.userId.toString(),
                userMessage: decryptValue(chat.userMessage),
                botResponse: decryptValue(chat.botResponse),
                intent: chat.intent,
                confidence: chat.confidence,
                createdAt: chat.createdAt,
            })),
        };
    } catch (error) {
        console.error("Error fetching chat messages:", error);
        return {
            success: false,
            error: "Failed to fetch chat messages",
        };
    }
}