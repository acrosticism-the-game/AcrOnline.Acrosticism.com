// Loads the word and theme lists for the "Acrosticize THIS!" daily challenge.
// These come from their own Google Sheet, separate from the main game's lists.

// "Publish to web" CSV links for the two tabs of the daily challenge sheet
// (Word Deck is the first tab, Theme Deck is the one with the gid).
export const DAILY_WORDS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLiBd5RCP3Wd3bktLKGmp11amwXnoo6bc2ZOUCGfsrvl8AfWnCxPbXcUn4U3SRZuyDIUud09yO3xGq/pub?output=csv";
export const DAILY_THEMES_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLiBd5RCP3Wd3bktLKGmp11amwXnoo6bc2ZOUCGfsrvl8AfWnCxPbXcUn4U3SRZuyDIUud09yO3xGq/pub?gid=1572239397&single=true&output=csv";

export const DAILY_WORDS_CACHE_KEY = "acr_daily_list_words";
export const DAILY_THEMES_CACHE_KEY = "acr_daily_list_themes";

// Reads the first column of a CSV, skips the header row, and handles quoted
// cells (a theme with a comma in it comes through as one entry).
export const parseFirstColumn = (csv: string): string[] => {
  const text = csv.replace(/^\uFEFF/, "");
  const firstCells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let firstCellDone = false;

  const endCell = () => {
    if (!firstCellDone) {
      firstCells.push(cell);
      firstCellDone = true;
    }
    cell = "";
  };
  const endRow = () => {
    endCell();
    firstCellDone = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endCell();
    } else if (ch === "\n") {
      endRow();
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  endRow();

  return firstCells
    .slice(1)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const capitalizeFirst = (entry: string) => entry.charAt(0).toUpperCase() + entry.slice(1);

// Gets the freshest list from the sheet. If the network fails, falls back to the
// copy saved on this device. Returns an empty list only if both fail.
export const loadDailyList = async (url: string, cacheKey: string): Promise<string[]> => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Bad response");
    const list = parseFirstColumn(await response.text()).map(capitalizeFirst);
    if (list.length === 0) throw new Error("Empty list");
    try {
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch { }
    return list;
  } catch {
    try {
      const raw = localStorage.getItem(cacheKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
        return parsed as string[];
      }
    } catch { }
    return [];
  }
};
