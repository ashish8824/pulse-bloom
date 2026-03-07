import mongoose, { Document, Schema } from "mongoose";

// ─────────────────────────────────────────────────────────────────
// JOURNAL ENTRY — MongoDB Schema
//
// Why MongoDB for journals?
// Journal text is unstructured and variable-length.
// MongoDB's flexible schema is optimal for text-heavy, schema-free data.
// Keeping journals separate from PostgreSQL keeps the MoodEntry
// table lean for fast analytics queries.
//
// Fields:
//   userId         → links back to PostgreSQL User.id (string UUID)
//   moodEntryId    → back-reference to PostgreSQL MoodEntry.id
//   text           → the journal content
//   tags           → optional context slugs for AI and filtering
//
// ── PHASE 5 ADDITIONS ─────────────────────────────────────────────
//   sentimentScore → float -1.0 to 1.0 (negative = negative tone,
//                    positive = positive tone). Written async by
//                    sentiment.service.ts after journal creation.
//                    null until the Groq sentiment call completes.
//
//   themes         → up to 5 keyword tags extracted from the journal
//                    text by Groq (e.g. ["stress", "work", "family"]).
//                    Distinct from user-supplied `tags` — these are
//                    AI-inferred topics, not user-supplied context slugs.
//                    Empty array until the sentiment call completes.
//
// WHY nullable/default instead of required?
//   Sentiment analysis is a fire-and-forget async side effect.
//   The journal is created first (synchronously), then the Groq call
//   runs in the background. The document exists with null sentimentScore
//   and empty themes[] until the async call updates it.
//   Making them required would mean we can't create the document
//   before the Groq call finishes — breaking the non-blocking design.
// ─────────────────────────────────────────────────────────────────

export interface IJournalEntry extends Document {
  userId: string;
  moodEntryId: string;
  text: string;
  tags: string[];
  sentimentScore: number | null; // ← PHASE 5: -1.0 to 1.0, null until analyzed
  themes: string[]; // ← PHASE 5: AI-extracted topics (up to 5)
  createdAt: Date;
  updatedAt: Date;
}

const journalSchema = new Schema<IJournalEntry>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Back-reference to the PostgreSQL MoodEntry row.
    // Updated after the Postgres insert so both stores are linked.
    moodEntryId: {
      type: String,
      required: true,
      unique: true, // one journal document per mood entry
      index: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    // User-supplied context slugs e.g. ["work", "sleep", "exercise"]
    // Surfaced to the AI prompt builder for richer behavioral context.
    // These are set by the USER at creation time.
    tags: {
      type: [String],
      default: [],
    },

    // ── PHASE 5 ────────────────────────────────────────────────────

    // AI-inferred sentiment score.
    // -1.0 = very negative, 0.0 = neutral, 1.0 = very positive.
    // Written by sentiment.service.ts after a fire-and-forget Groq call.
    // null = not yet analyzed (newly created journal, or Groq call pending).
    sentimentScore: {
      type: Number,
      min: -1.0,
      max: 1.0,
      default: null,
    },

    // AI-inferred topic tags from the journal text.
    // e.g. ["stress", "productivity", "family", "sleep"]
    // Up to 5 items. Set by sentiment.service.ts alongside sentimentScore.
    // Empty array = not yet analyzed.
    themes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
    versionKey: false, // removes __v from all documents
  },
);

// Compound index: efficient "journals for user, newest first" queries.
// Used by journal hydration in getMoodById and the sentiment trends endpoint.
journalSchema.index({ userId: 1, createdAt: -1 });

// ── PHASE 5: Index for sentiment trends query ──────────────────────
// GET /api/mood/sentiment/trends groups journals by week and averages
// sentimentScore. This index covers: filter by userId + sentimentScore not null
// + sort by createdAt — the exact pattern used in the MongoDB aggregation.
journalSchema.index({ userId: 1, sentimentScore: 1, createdAt: -1 });

export const JournalModel = mongoose.model<IJournalEntry>(
  "JournalEntry",
  journalSchema,
);
