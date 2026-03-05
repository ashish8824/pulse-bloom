// src/modules/community/community.mongo.ts
//
// MONGODB SCHEMA — CommunityPost
//
// WHY MONGODB (not PostgreSQL) for the community feed?
//
//   1. SCHEMA FLEXIBILITY: Posts can have optional fields that vary
//      by type — MILESTONE posts have habitTitle + streakCount,
//      REFLECTION posts have freeform text + tags. MongoDB handles
//      this without nullable columns everywhere.
//
//   2. ANONYMITY GUARANTEE: We store NO userId on the document.
//      There is no column to accidentally JOIN or leak. The auth
//      middleware verifies identity to write, but identity is
//      intentionally discarded before the document is created.
//
//   3. UPVOTE ARRAY: upvotedBy is a string[] (array of hashed userId
//      values). Arrays are a native MongoDB type — in Postgres this
//      would require a separate UpvoteLog table + join.
//
//      WHY HASHED?
//      We need to prevent double-upvoting (one user, one upvote)
//      but we promised anonymity. The solution: HMAC-SHA256(userId)
//      using a server-side secret. The same user always maps to the
//      same hash (idempotency) but the hash cannot be reversed to
//      reveal the user (anonymity). This is a one-way anonymity token.
//
// ─────────────────────────────────────────────────────────────────

import mongoose, { Document, Schema } from "mongoose";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type PostType = "MILESTONE" | "REFLECTION";

export interface ICommunityPost extends Document {
  type: PostType;
  content: string; // the main text (milestone description or reflection)
  tags: string[]; // up to 5 lowercase slugs e.g. ["meditation", "streak"]
  upvotes: number; // denormalized count — always upvotedBy.length
  upvotedBy: string[]; // HMAC hashes of userIds (NOT raw userIds)
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    type: {
      type: String,
      enum: ["MILESTONE", "REFLECTION"],
      required: true,
      index: true, // filter by type in the feed
    },

    content: {
      type: String,
      required: true,
      maxlength: 500, // short enough to be a "community card" not an essay
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 5,
        message: "Maximum 5 tags per post",
      },
    },

    // Denormalized upvote count — always kept in sync with upvotedBy.length
    // Stored separately for fast sorting without $size aggregation
    upvotes: {
      type: Number,
      default: 0,
      index: true, // sort by most upvoted
    },

    // HMAC hashes of userIds — prevents double-upvoting without storing identity
    upvotedBy: {
      type: [String],
      default: [],
      select: false, // NEVER returned in API responses — internal only
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  },
);

// ─────────────────────────────────────────────────────────────────
// INDEXES
//
//   { createdAt: -1 }        → paginated feed sorted newest first
//   { upvotes: -1 }          → "most popular" feed sort
//   { type: 1, createdAt: -1 } → type-filtered feed
//   { tags: 1 }              → filter by tag
// ─────────────────────────────────────────────────────────────────
CommunityPostSchema.index({ createdAt: -1 });
CommunityPostSchema.index({ upvotes: -1 });
CommunityPostSchema.index({ type: 1, createdAt: -1 });
CommunityPostSchema.index({ tags: 1 });

export const CommunityPostModel = mongoose.model<ICommunityPost>(
  "CommunityPost",
  CommunityPostSchema,
);
