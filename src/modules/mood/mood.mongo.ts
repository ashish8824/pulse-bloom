import mongoose from "mongoose";

/**
 * MongoDB Schema for journal entries
 * Stores unstructured text data
 */
const journalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    sentimentScore: {
      type: Number,
      default: 0,
    },
    themes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

export const JournalModel = mongoose.model("JournalEntry", journalSchema);
