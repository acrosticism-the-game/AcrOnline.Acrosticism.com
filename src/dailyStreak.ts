// Tracks how many days in a row the player has finished the daily challenge.
// It is saved on this device only.

const STREAK_KEY = "acr_daily_streak";

export type StreakData = {
  current: number;
  best: number;
  lastDate: string;
};

const EMPTY_STREAK: StreakData = { current: 0, best: 0, lastDate: "" };

// The day before a YYYY-MM-DD date, as YYYY-MM-DD.
export const getPreviousDateString = (dateString: string): string => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10);
};

export const readStreak = (): StreakData => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.current === "number" &&
        typeof parsed.best === "number" &&
        typeof parsed.lastDate === "string"
      ) {
        return parsed as StreakData;
      }
    }
  } catch { }
  return EMPTY_STREAK;
};

// Call this when the player finishes today's challenge. Calling it again on the
// same day changes nothing.
export const recordDailyPlay = (today: string): StreakData => {
  const saved = readStreak();
  if (saved.lastDate === today) return saved;

  const current = saved.lastDate === getPreviousDateString(today) ? saved.current + 1 : 1;
  const next: StreakData = {
    current,
    best: Math.max(saved.best, current),
    lastDate: today,
  };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch { }
  return next;
};

// The streak to show. It only counts if the player finished today or yesterday.
export const getLiveStreak = (streak: StreakData, today: string): number =>
  streak.lastDate === today || streak.lastDate === getPreviousDateString(today)
    ? streak.current
    : 0;
