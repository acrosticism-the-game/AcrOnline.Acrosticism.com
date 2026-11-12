// Helpers for the "Acrosticize THIS!" daily challenge.
// Everything here is deterministic: the same date always gives the same word and theme,
// so every player sees the same challenge without any database.

// Day No. 1 of the challenge. Use a Sunday so the weekly theme changes on Sundays.
export const DAILY_LAUNCH_DATE = "2026-11-08";

// "Today" is always judged in Eastern time so every player sees the same challenge.
const DAILY_TIME_ZONE = "America/New_York";

export const DAILY_SHARE_URL = "https://play.acrosticism.com";

// True when the app is shown inside another page, such as the Google Site embed.
export const isEmbedded = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// True when the app is installed and running like a standalone app (PWA).
const isStandalone = (): boolean => {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
};

// Same tab on the website, new tab inside an embed or the installed app.
export const getLinkTarget = (): "_top" | "_blank" =>
  isEmbedded() || isStandalone() ? "_blank" : "_top";

// Tags the business page when the platform supports mentions.
export const SHARE_HANDLE = "@acrosticismgame";

// Hashtags added to every shared post.
export const DAILY_HASHTAGS = "#AcrosticizeTHIS #ShareTheChaos #AcrosticismGame #WordsAreHard";

// Today's date in Eastern time, as YYYY-MM-DD.
export const getDailyDateString = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

const dateStringToDayNumber = (dateString: string): number => {
  const [y, m, d] = dateString.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

// 0 on launch day, 1 the next day, and so on (never negative).
const getDayIndex = (dateString: string): number =>
  Math.max(
    0,
    dateStringToDayNumber(dateString) - dateStringToDayNumber(DAILY_LAUNCH_DATE)
  );

// The challenge number shown to players: No. 1 on launch day.
export const getDailyNumber = (dateString: string): number =>
  getDayIndex(dateString) + 1;

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Small seeded random number generator (same seed gives the same sequence).
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Shuffles the list the same way every time for a given cycle, then takes one entry.
// Going through the shuffled list one day at a time means no repeats until the whole
// list has been used once.
const pickFromCycle = (
  list: string[],
  position: number,
  cycle: number,
  salt: string
): string => {
  if (list.length === 0) return "";
  const order = list.map((_, i) => i);
  const rand = mulberry32(hashString(`${salt}:${cycle}`));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return (list[order[position]] || "").trim();
};

export const getDailyWord = (words: string[], dateString: string): string => {
  const n = words.length;
  if (n === 0) return "";
  const day = getDayIndex(dateString);
  return pickFromCycle(words, day % n, Math.floor(day / n), "word");
};

export const getDailyTheme = (themes: string[], dateString: string): string => {
  const n = themes.length;
  if (n === 0) return "";
  const week = Math.floor(getDayIndex(dateString) / 7);
  return pickFromCycle(themes, week % n, Math.floor(week / n), "theme");
};

// The text a player copies and pastes to social media.
export const buildShareText = (args: {
  number: number;
  theme: string;
  word: string;
  lines: string[];
  streak?: number;
}): string => {
  const { number, theme, word, lines, streak } = args;
  const header =
    streak && streak >= 2
      ? `Acrosticize THIS! No. ${number} · ${streak} day streak`
      : `Acrosticize THIS! No. ${number}`;
  const body = word
    .split("")
    .map((letter, i) => (lines[i] || "").trim() || `${letter.toUpperCase()}...`)
    .join("\n");

  return [
    header,
    `Theme: ${theme}`,
    `Word: ${word.toUpperCase()}`,
    "",
    body,
    "",
    "Think you’ve got what it takes?",
    `Acrosticize THIS at ${DAILY_SHARE_URL}`,
    `${SHARE_HANDLE} ${DAILY_HASHTAGS}`,
  ].join("\n");
};
