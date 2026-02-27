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
//   userId       → links back to PostgreSQL User.id (string UUID)
//   moodEntryId  → back-reference to PostgreSQL MoodEntry.id
//   text         → the journal content
//   tags         → optional context slugs for AI and filtering
// ─────────────────────────────────────────────────────────────────

export interface IJournalEntry extends Document {
  userId: string;
  moodEntryId: string;
  text: string;
  tags: string[];
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

    // Optional context tags e.g. ["work", "sleep", "exercise"]
    // Surfaced to the AI prompt builder for richer behavioral context
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
    versionKey: false, // removes __v from all documents
  },
);

// Compound index: efficient "journals for user, newest first" queries
// Used by journal hydration in getMoodById and future journal history endpoint
journalSchema.index({ userId: 1, createdAt: -1 });

export const JournalModel = mongoose.model<IJournalEntry>(
  "JournalEntry",
  journalSchema,
);
