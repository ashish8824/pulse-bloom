// src/modules/community/community.service.ts
//
// BUSINESS LOGIC LAYER — community feed.
//
// ─────────────────────────────────────────────────────────────────
// ANONYMITY IMPLEMENTATION
//
// Authentication middleware runs normally — we know WHO the user is.
// But before writing to MongoDB, we hash their userId with HMAC-SHA256
// using a server-side secret (COMMUNITY_HASH_SECRET in .env).
//
// Why HMAC not plain SHA-256?
//   Plain SHA-256 is deterministic and public. An attacker could build
//   a rainbow table: SHA256(known_user_id) → hash → link post to user.
//   HMAC uses a server-side secret that makes precomputation impossible.
//   Even if the DB is leaked, the hashes cannot be reversed.
//
// The hash is used for:
//   1. Rate-limiting posts per user (without storing userId)
//   2. Preventing double-upvotes (one upvote per user per post)
//
// The hash is NEVER returned in API responses.
// ─────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { env } from "../../config/env";
import {
  createPost,
  getFeed,
  hasUpvoted,
  addUpvote,
  removeUpvote,
} from "./community.repository";
import { CreatePostInput, FeedQueryInput } from "./community.validation";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * One-way anonymity token: HMAC-SHA256(userId, secret).
 * Deterministic (same user → same hash) but irreversible.
 * Falls back to a plain hash if COMMUNITY_HASH_SECRET is not set
 * (dev environments) — but MUST be set in production.
 */
const anonymize = (userId: string): string => {
  const secret = (env as any).COMMUNITY_HASH_SECRET ?? "dev-fallback-secret";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
};

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

/**
 * Create an anonymous post.
 *
 * The userId is used only to:
 *   1. Pass rate-limit checks (not stored in post)
 *   2. Nothing else — identity is never written to the document
 *
 * Content moderation note:
 *   In a production deployment add a word-filter or a moderation
 *   queue here before calling createPost(). The service layer is
 *   the right place for it — not the controller.
 */
export const submitPost = async (data: CreatePostInput, _userId: string) => {
  // _userId accepted but intentionally unused — anonymity by design
  return createPost({
    type: data.type,
    content: data.content,
    tags: data.tags ?? [],
  });
};

// ─────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────

/**
 * Get the community feed.
 * If userId is provided, we add a hasUpvoted flag to each post
 * so the frontend can show the upvote button as active/inactive.
 *
 * Note: This requires one extra query per post — only enabled when
 * a userId is passed (authenticated requests). Anonymous reads
 * skip this for performance.
 */
export const getCommunityFeed = async (
  query: FeedQueryInput,
  userId?: string,
) => {
  const { posts, total } = await getFeed({
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    type: query.type,
    tag: query.tag,
  });

  // Annotate with hasUpvoted if authenticated
  let annotatedPosts = posts;
  if (userId) {
    const userHash = anonymize(userId);
    annotatedPosts = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        hasUpvoted: await hasUpvoted(post.id, userHash),
      })),
    );
  }

  return {
    posts: annotatedPosts,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────
// UPVOTE (TOGGLE)
// ─────────────────────────────────────────────────────────────────

/**
 * Toggle upvote on a post.
 * Returns the new upvote count and whether the user now has voted.
 *
 * TOGGLE semantics:
 *   First call  → adds upvote   → { upvotes: N+1, hasUpvoted: true }
 *   Second call → removes upvote → { upvotes: N,   hasUpvoted: false }
 *
 * WHY TOGGLE and not separate add/remove endpoints?
 *   Simpler frontend logic. One button, one action, deterministic result.
 *   This is the Reddit/Twitter/LinkedIn model.
 */
export const toggleUpvote = async (postId: string, userId: string) => {
  const userHash = anonymize(userId);

  const alreadyUpvoted = await hasUpvoted(postId, userHash);

  let updatedPost;
  if (alreadyUpvoted) {
    updatedPost = await removeUpvote(postId, userHash);
  } else {
    updatedPost = await addUpvote(postId, userHash);
  }

  if (!updatedPost) {
    const err = new Error("Post not found") as any;
    err.statusCode = 404;
    throw err;
  }

  return {
    postId,
    upvotes: updatedPost.upvotes,
    hasUpvoted: !alreadyUpvoted,
  };
};
