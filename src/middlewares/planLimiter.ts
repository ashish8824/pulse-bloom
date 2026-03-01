// src/middlewares/planLimiter.ts

import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

// ─────────────────────────────────────────────────────────────────
// PLAN LIMITS TABLE
//
// Single source of truth for all tier restrictions.
// Update this object when plans change — no other file needs touching.
//
// Limits:
//   habits        → max active (non-archived) habits allowed
//   moodHistoryDays → how far back paginated mood history goes
//   aiInsights    → can they call GET /api/ai/insights at all?
//   teamFeatures  → can they access org/team endpoints?
//
// null = unlimited / unrestricted
// ─────────────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free: {
    habits: 3,
    moodHistoryDays: 30,
    aiInsights: false,
    teamFeatures: false,
  },
  pro: {
    habits: null, // unlimited
    moodHistoryDays: null, // full history
    aiInsights: true,
    teamFeatures: false,
  },
  enterprise: {
    habits: null,
    moodHistoryDays: null,
    aiInsights: true,
    teamFeatures: true,
  },
} as const;

// ─────────────────────────────────────────────────────────────────
// RESOURCE TYPE
//
// Each middleware call targets one specific resource to check.
// This keeps the function signatures clean and the error messages precise.
// ─────────────────────────────────────────────────────────────────
type LimitableResource =
  | "habit_create" // checked before POST /api/habits
  | "mood_history" // checked before GET /api/mood (date range)
  | "ai_insights" // checked before GET /api/ai/insights
  | "team_features"; // checked before any /api/orgs or /api/teams route

// ─────────────────────────────────────────────────────────────────
// UPGRADE PROMPT RESPONSE SHAPE
//
// A consistent 403 payload the frontend can pattern-match on.
// The `upgradeUrl` field drives the "Upgrade" CTA button directly.
// ─────────────────────────────────────────────────────────────────
interface UpgradePromptResponse {
  error: "plan_limit_reached";
  message: string;
  currentPlan: string;
  requiredPlan: string;
  upgradeUrl: string;
  limit?: number | null; // the actual limit that was hit (e.g. 3 habits)
  current?: number; // how many they currently have
}

// ─────────────────────────────────────────────────────────────────
// HELPER — build the upgrade prompt 403 response
// ─────────────────────────────────────────────────────────────────
function buildUpgradeResponse(
  currentPlan: string,
  requiredPlan: string,
  message: string,
  limit?: number | null,
  current?: number,
): UpgradePromptResponse {
  return {
    error: "plan_limit_reached",
    message,
    currentPlan,
    requiredPlan,
    upgradeUrl: `${process.env.APP_URL}/billing/upgrade?from=${currentPlan}&to=${requiredPlan}`,
    ...(limit !== undefined && { limit }),
    ...(current !== undefined && { current }),
  };
}

// ─────────────────────────────────────────────────────────────────
// checkPlanLimit — MIDDLEWARE FACTORY
//
// Usage in routes:
//   router.post("/", protect, checkPlanLimit("habit_create"), habitController.create);
//   router.get("/", protect, checkPlanLimit("mood_history"), moodController.list);
//   router.get("/insights", protect, checkPlanLimit("ai_insights"), aiController.insights);
//
// Flow:
//   1. Read req.userId (set by protect middleware — must run after it)
//   2. Fetch user.plan from DB (single lightweight select)
//   3. Run the resource-specific check against PLAN_LIMITS
//   4. If limit hit → 403 with upgrade prompt JSON
//   5. If OK → call next() and let the route handler proceed
//
// DB query note:
//   We fetch plan fresh from DB (not from JWT) so a plan upgrade
//   takes effect immediately without requiring a new access token.
// ─────────────────────────────────────────────────────────────────
export function checkPlanLimit(resource: LimitableResource) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId;

      // Fetch the user's current plan — lightweight select, no joins
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const plan = user.plan;
      const limits = PLAN_LIMITS[plan];

      // ── habit_create ────────────────────────────────────────────
      // Counts current active (non-archived) habits for this user.
      // If they're at the limit, block with upgrade prompt.
      // pro/enterprise have limits.habits === null → always pass.
      // ────────────────────────────────────────────────────────────
      if (resource === "habit_create") {
        if (limits.habits === null) {
          // No limit on this plan — skip the DB count entirely
          next();
          return;
        }

        const activeHabitCount = await prisma.habit.count({
          where: { userId, isArchived: false },
        });

        if (activeHabitCount >= limits.habits) {
          res
            .status(403)
            .json(
              buildUpgradeResponse(
                plan,
                "pro",
                `Free plan allows a maximum of ${limits.habits} active habits. Archive an existing habit or upgrade to Pro for unlimited habits.`,
                limits.habits,
                activeHabitCount,
              ),
            );
          return;
        }
      }

      // ── mood_history ─────────────────────────────────────────────
      // Free users can only query mood history within the last 30 days.
      // We inspect the ?startDate query param — if it's older than the
      // allowed window, we clamp it and attach the clamped date so the
      // route handler can use it transparently.
      //
      // Design choice: we clamp rather than 403 so free users still get
      // partial data and see a non-breaking experience. The response
      // includes a `planLimit` field the frontend uses to show a banner.
      // ─────────────────────────────────────────────────────────────
      if (resource === "mood_history") {
        if (limits.moodHistoryDays === null) {
          next();
          return;
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - limits.moodHistoryDays);

        const requestedStart = req.query.startDate
          ? new Date(req.query.startDate as string)
          : null;

        if (requestedStart && requestedStart < cutoff) {
          // Clamp the startDate to the allowed window
          // The route handler reads req.query.startDate — we override it here
          req.query.startDate = cutoff.toISOString().split("T")[0];

          // Attach a flag so the controller can include a plan notice in the response
          (req as any).planLimitApplied = {
            resource: "mood_history",
            clampedTo: req.query.startDate,
            allowedDays: limits.moodHistoryDays,
            upgradeUrl: `${process.env.APP_URL}/billing/upgrade?from=${plan}&to=pro`,
          };
        }
      }

      // ── ai_insights ──────────────────────────────────────────────
      // Hard gate — free users cannot access AI insights at all.
      // ─────────────────────────────────────────────────────────────
      if (resource === "ai_insights") {
        if (!limits.aiInsights) {
          res
            .status(403)
            .json(
              buildUpgradeResponse(
                plan,
                "pro",
                "AI-powered behavioral insights are available on the Pro plan. Upgrade to unlock cross-correlation analysis and personalised recommendations.",
                null,
              ),
            );
          return;
        }
      }

      // ── team_features ─────────────────────────────────────────────
      // Hard gate — only enterprise plan can access org/team endpoints.
      // ─────────────────────────────────────────────────────────────
      if (resource === "team_features") {
        if (!limits.teamFeatures) {
          const requiredPlan = plan === "free" ? "pro" : "enterprise";
          res
            .status(403)
            .json(
              buildUpgradeResponse(
                plan,
                "enterprise",
                "Team and organization features are available on the Enterprise plan.",
                null,
              ),
            );
          return;
        }
      }

      next();
    } catch (error) {
      // Don't block the request on a middleware DB failure — log and pass through.
      // In production you'd want to alert on this, but never silently fail closed
      // in a way that breaks the app for paying customers.
      console.error("[planLimiter] Error checking plan limit:", error);
      next(error);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// getPlanLimits — utility exported for use in service responses
//
// Lets controllers include plan info in list responses so the
// frontend knows the current limit without a separate API call.
//
// Usage in mood.controller.ts:
//   const limits = getPlanLimits(user.plan);
//   res.json({ data: moods, pagination, planLimits: limits });
// ─────────────────────────────────────────────────────────────────
export function getPlanLimits(plan: keyof typeof PLAN_LIMITS) {
  return PLAN_LIMITS[plan];
}
