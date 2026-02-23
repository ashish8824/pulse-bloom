/**
 * Normalize date for daily habit
 */
export const normalizeDailyDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Normalize date for weekly habit (ISO week start)
 */
export const normalizeWeeklyDate = () => {
  const now = new Date();
  const day = now.getDay(); // 0-6
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};
