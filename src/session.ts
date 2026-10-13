export type Role = "player" | "spectator" | "host-spectator";

export type SavedSession = {
  roomId: string;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  role: Role;
  hostToken: string;
  savedAt: number;
};

const KEY = "acr_session";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const saveSession = (
  s: Omit<SavedSession, "savedAt" | "role" | "hostToken"> &
    Partial<Pick<SavedSession, "role" | "hostToken">>
) => {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ role: "player", hostToken: "", ...s, savedAt: Date.now() })
    );
  } catch { }
};

export const loadSession = (): SavedSession | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = { role: "player", hostToken: "", ...JSON.parse(raw) } as SavedSession;
    return Date.now() - s.savedAt > MAX_AGE_MS ? null : s;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch { }
};