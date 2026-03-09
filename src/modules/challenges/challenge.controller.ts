// src/modules/challenges/challenge.controller.ts
//
// HTTP LAYER — one function per endpoint, no business logic.
// Validation runs at route level via Zod middleware before reaching here.

import { Request, Response, NextFunction } from "express";
import {
  createChallenge,
  listPublicChallenges,
  getMyChallenges,
  getJoinedChallenges,
  joinChallenge,
  markChallengeComplete,
  getLeaderboard,
} from "./challenge.service";
import {
  createChallengeSchema,
  joinChallengeSchema,
  listChallengesSchema,
} from "./challenge.validation";

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p);

// ─── CREATE ───────────────────────────────────────────────────────

export const createChallengeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createChallengeSchema.parse(req.body);
    const challenge = await createChallenge(data, req.userId!);
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
};

// ─── LIST ─────────────────────────────────────────────────────────

/** Public challenge discovery feed */
export const listChallengesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, active } = listChallengesSchema.parse(req.query);
    const result = await listPublicChallenges(page, limit, active);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/** Challenges created by the authenticated user */
export const getMyChallengesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const challenges = await getMyChallenges(req.userId!);
    res.status(200).json({ challenges });
  } catch (err) {
    next(err);
  }
};

/** Challenges the authenticated user has joined */
export const getJoinedChallengesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const challenges = await getJoinedChallenges(req.userId!);
    res.status(200).json({ challenges });
  } catch (err) {
    next(err);
  }
};

// ─── JOIN ─────────────────────────────────────────────────────────

/**
 * Join a challenge by ID (public) or joinCode (private).
 * If joinCode is in the body → private challenge join.
 * Otherwise the challengeId from params is used for public join.
 */
export const joinChallengeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { joinCode } = joinChallengeSchema.parse(req.body);
    const result = await joinChallenge(
      param(req.params.id),
      req.userId!,
      joinCode,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── PROGRESS ─────────────────────────────────────────────────────

/** Manually mark a day complete (for non-habit-linked challenges) */
export const completeChallengeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await markChallengeComplete(
      param(req.params.id),
      req.userId!,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── LEADERBOARD ──────────────────────────────────────────────────

export const getLeaderboardHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getLeaderboard(param(req.params.id), req.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
