// src/modules/ai/chat.mongo.ts
//
// ─────────────────────────────────────────────────────────────────
// AI CONVERSATION — MongoDB Schema
//
// WHY MONGODB (not PostgreSQL)?
//   Conversation history is variable-length, semi-structured, and
//   text-heavy — exactly the use case MongoDB is optimized for.
//   Storing messages as an embedded array in one document avoids
//   expensive JOIN queries when we need the full history to inject
//   into the next Groq call. One findOne() gives us everything.
//
// DOCUMENT STRUCTURE:
//   One document per (userId, conversationId) pair.
//   Each document contains an embedded array of messages.
//   Messages are ordered chronologically (oldest first).
//
// CONVERSATION LIFECYCLE:
//   - Created on first POST /api/ai/chat without a conversationId
//   - Updated (messages pushed) on subsequent calls with the conversationId
//   - Max 50 messages kept per conversation (older messages pruned)
//   - Max 20 conversations per user (oldest pruned on overflow)
//
// WHY EMBED MESSAGES (not a separate collection)?
//   We always need ALL messages in a conversation together (to inject
//   into the system prompt). Embedding means one read, not N reads.
//   The 50-message cap keeps documents from growing unbounded.
// ─────────────────────────────────────────────────────────────────

import mongoose, { Document, Schema } from "mongoose";

// ─── TYPES ────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface IMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface IAiConversation extends Document {
  userId: string; // links to PostgreSQL User.id
  title: string; // first 60 chars of the first user message — for UI list
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── SCHEMA ───────────────────────────────────────────────────────

const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000, // cap individual message length
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }, // no _id per message — saves storage, we don't need per-message IDs
);

const aiConversationSchema = new Schema<IAiConversation>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Auto-generated from the first user message.
    // Used in a future "conversation list" UI.
    // e.g. "Why do I feel better on Mondays than..."
    title: {
      type: String,
      required: true,
      maxlength: 80,
    },

    // Embedded message array.
    // Ordered: oldest first (chronological).
    // Max 50 messages — enforced in chat.service.ts before every push.
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
    versionKey: false,
  },
);

// Index: "list my conversations, newest first"
// Used by a future GET /api/ai/conversations endpoint.
aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AiConversationModel = mongoose.model<IAiConversation>(
  "AiConversation",
  aiConversationSchema,
);
