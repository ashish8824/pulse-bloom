// src/modules/community/community.controller.ts

import { Request, Response, NextFunction } from "express";
import {
  submitPost,
  getCommunityFeed,
  toggleUpvote,
} from "./community.service";
import { createPostSchema, feedQuerySchema } from "./community.validation";

/**
 * POST /api/community
 * Submit an anonymous post. userId is verified by auth middleware
 * but intentionally discarded — anonymity by design.
 */
export const createPostHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createPostSchema.parse(req.body);
    const post = await submitPost(data, req.userId!);
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/community
 * Public feed — no auth required.
 * If authenticated, adds hasUpvoted flag to each post.
 */
export const getFeedHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = feedQuerySchema.parse(req.query);
    // req.userId is undefined for unauthenticated requests
    const result = await getCommunityFeed(query, req.userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/community/:id/upvote
 * Toggle upvote on a post. Requires auth (to enforce one vote per user).
 */
export const upvoteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await toggleUpvote(req.params.id, req.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
