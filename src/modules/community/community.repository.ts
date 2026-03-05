// src/modules/community/community.repository.ts
//
// DB LAYER — all MongoDB queries for community posts.
// No Prisma here — this module is 100% MongoDB.

import { CommunityPostModel, PostType } from "./community.mongo";

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

/**
 * Create an anonymous post.
 * The service strips user identity before calling this — this function
 * receives NO userId and stores NO userId. Pure anonymous creation.
 */
export const createPost = async (data: {
  type: PostType;
  content: string;
  tags: string[];
}) => {
  const post = await CommunityPostModel.create({
    type: data.type,
    content: data.content,
    tags: data.tags.map((t) => t.toLowerCase().trim()),
    upvotes: 0,
    upvotedBy: [],
  });

  // Return without upvotedBy (internal field)
  return {
    id: post._id.toString(),
    type: post.type,
    content: post.content,
    tags: post.tags,
    upvotes: post.upvotes,
    createdAt: post.createdAt,
  };
};

// ─────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────

type FeedSort = "newest" | "popular";

/**
 * Get paginated community feed.
 * upvotedBy is excluded from all read queries via the schema's
 * select: false — it never leaks into the API response.
 *
 * WHY cursor-based pagination isn't used here:
 *   The feed is public and non-personalised. Offset pagination is
 *   simpler and acceptable for a feed that doesn't change rapidly.
 *   If the feed grows to millions of posts, switch to cursor here.
 */
export const getFeed = async (opts: {
  page: number;
  limit: number;
  sort: FeedSort;
  type?: PostType;
  tag?: string;
}) => {
  const { page, limit, sort, type, tag } = opts;

  const filter: any = {};
  if (type) filter.type = type;
  if (tag) filter.tags = tag.toLowerCase();

  const sortOrder = sort === "popular" ? { upvotes: -1 } : { createdAt: -1 };

  const [posts, total] = await Promise.all([
    CommunityPostModel.find(filter)
      .sort(sortOrder as any)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-upvotedBy") // belt-and-suspenders: explicitly exclude
      .lean(),
    CommunityPostModel.countDocuments(filter),
  ]);

  return {
    posts: posts.map((p) => ({
      id: p._id.toString(),
      type: p.type,
      content: p.content,
      tags: p.tags,
      upvotes: p.upvotes,
      createdAt: p.createdAt,
    })),
    total,
  };
};

// ─────────────────────────────────────────────────────────────────
// UPVOTE
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a userHash has already upvoted a post.
 * Uses $in on upvotedBy — fast with the array index.
 *
 * WHY HMAC hash and not raw userId?
 * See community.mongo.ts for the full explanation.
 */
export const hasUpvoted = async (
  postId: string,
  userHash: string,
): Promise<boolean> => {
  const post = await CommunityPostModel.findOne({
    _id: postId,
    upvotedBy: userHash,
  })
    .select("_id")
    .lean();
  return post !== null;
};

/**
 * Add an upvote to a post.
 * Uses $addToSet to prevent duplicate hashes (extra safety net).
 * Increments the denormalized upvotes counter atomically.
 * Returns null if post not found.
 */
export const addUpvote = async (postId: string, userHash: string) => {
  return CommunityPostModel.findByIdAndUpdate(
    postId,
    {
      $addToSet: { upvotedBy: userHash },
      $inc: { upvotes: 1 },
    },
    { new: true, select: "-upvotedBy" },
  );
};

/**
 * Remove an upvote (toggle off).
 * Uses $pull to remove the hash from the array.
 * Decrements counter but never goes below 0.
 */
export const removeUpvote = async (postId: string, userHash: string) => {
  return CommunityPostModel.findByIdAndUpdate(
    postId,
    {
      $pull: { upvotedBy: userHash },
      $inc: { upvotes: -1 },
    },
    { new: true, select: "-upvotedBy" },
  );
};
