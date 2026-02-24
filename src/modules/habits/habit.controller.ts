import { Request, Response, NextFunction } from "express";
import {
  createHabitSchema,
  updateHabitSchema,
  completeHabitSchema,
  reorderHabitsSchema,
  reminderSchema,
} from "./habit.validation";
import {
  createHabit,
  fetchUserHabits,
  fetchArchivedHabits,
  updateHabit,
  archiveHabit,
  restoreHabit,
  completeHabit,
  undoLastCompletion,
  reorderHabits,
  updateReminder,
  calculateHabitStreak,
  calculateHabitAnalytics,
  getMonthlyHabitSummary,
  generateHabitHeatmap,
  fetchPaginatedLogs,
} from "./habit.service";

// ─────────────────────────────────────────────────────────────────
// CONTROLLERS — thin layer, no business logic
// Parse input → call service → send response → forward errors
// ─────────────────────────────────────────────────────────────────

// ─── CRUD ─────────────────────────────────────────────────────────

/** POST /api/habits — create a new habit */
export const createHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = createHabitSchema.parse(req.body);
    const habit = await createHabit(validated, req.userId!);
    res.status(201).json(habit);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits — list active habits
 * Optional query param: ?category=health
 */
export const getHabitsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const category = req.query.category as string | undefined;
    const habits = await fetchUserHabits(req.userId!, category);
    res.json(habits);
  } catch (error) {
    next(error);
  }
};

/** GET /api/habits/archived — list archived habits */
export const getArchivedHabitsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const habits = await fetchArchivedHabits(req.userId!);
    res.json(habits);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/habits/:id — partial update */
export const updateHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = updateHabitSchema.parse(req.body);
    const updated = await updateHabit(req.params.id, req.userId!, validated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/habits/:id — soft-delete (archive) */
export const archiveHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await archiveHabit(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/habits/:id/restore — unarchive */
export const restoreHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await restoreHabit(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────

/** POST /api/habits/:id/complete — mark as completed */
export const completeHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = completeHabitSchema.parse(req.body ?? {});
    const result = await completeHabit(
      req.params.id,
      req.userId!,
      validated.note,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/habits/:id/complete — undo last completion */
export const undoCompletionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await undoLastCompletion(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/habits/reorder — update sort order */
export const reorderHabitsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = reorderHabitsSchema.parse(req.body);
    const result = await reorderHabits(req.userId!, validated);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/habits/:id/reminder — update reminder settings */
export const updateReminderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = reminderSchema.parse(req.body);
    const result = await updateReminder(req.params.id, req.userId!, validated);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── ANALYTICS ────────────────────────────────────────────────────

/** GET /api/habits/:id/streak */
export const getHabitStreakController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await calculateHabitStreak(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/habits/:id/analytics */
export const getHabitAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await calculateHabitAnalytics(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits/:id/summary?month=2026-02
 * Monthly calendar summary for a habit
 */
export const getMonthlyHabitSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Default to current month if not provided
    const month =
      (req.query.month as string) ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"

    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res
        .status(400)
        .json({ error: "month must be in YYYY-MM format (e.g. 2026-02)" });
      return;
    }

    const result = await getMonthlyHabitSummary(
      req.params.id,
      req.userId!,
      month,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits/:id/heatmap?days=365
 * GitHub-style heatmap data
 */
export const getHabitHeatmapController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawDays = req.query.days;
    const days = rawDays ? Number(rawDays) : 365;

    if (!Number.isFinite(days) || days < 1) {
      res.status(400).json({ error: "'days' must be a positive integer" });
      return;
    }

    const result = await generateHabitHeatmap(
      req.params.id,
      req.userId!,
      Math.min(days, 730), // cap at 2 years
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits/:id/logs?page=1&limit=20
 * Paginated completion log history
 */
export const getPaginatedLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await fetchPaginatedLogs(
      req.params.id,
      req.userId!,
      page,
      limit,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};
