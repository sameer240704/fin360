import { Schema, model, models, Document, Types } from "mongoose";

const ChatSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: "User", required: true },
        userMessage: { type: String, required: true },
        botResponse: { type: String, required: true },
        intent: { type: String, required: false },
        confidence: { type: Number, required: false },
    },
    { timestamps: true }
);

const Chat = models.Chat || model("Chat", ChatSchema);

export default Chat;
