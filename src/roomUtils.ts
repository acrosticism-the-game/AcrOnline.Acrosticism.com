import { supabase } from "./supabaseClient";
import { containsProfanity } from "./profanity";

// Filter words to valid room-code length (3 to 7 letters, alphabetic only)
export const filterRoomCodeWords = (words: string[]): string[] => {
  return words.filter((w) => {
    const clean = w.trim();
    return clean.length >= 3 && clean.length <= 7 && /^[a-zA-Z]+$/.test(clean);
  });
};

// Pick an unused room code word; fall back to a word plus two digits
export const generateUniqueRoomCode = async (
  candidateWords: string[]
): Promise<string | null> => {
  if (candidateWords.length === 0) return null;

  const { data: existing, error } = await supabase
    .from("rooms")
    .select("room_code");
  if (error) throw error;

  const taken = new Set(
    (existing || []).map((r: any) => String(r.room_code).toUpperCase())
  );
  const upper = candidateWords.map((w) => w.toUpperCase());

  const free = upper.filter((w) => !taken.has(w));
  if (free.length > 0) {
    return free[Math.floor(Math.random() * free.length)];
  }

  for (let i = 0; i < 50; i++) {
    const base = upper[Math.floor(Math.random() * upper.length)];
    const code = base + Math.floor(10 + Math.random() * 90);
    if (!taken.has(code)) return code;
  }

  return null;
};

export const createRoom = async (
  hostName: string,
  anonymousSubmissions: boolean,
  candidateWords: string[],
  hostAsSpectator = false,
  wordFilter = false
) => {
  const roomCode = await generateUniqueRoomCode(candidateWords);
  if (!roomCode) throw new Error("Could not generate a unique room code. Try again.");

  const { data, error } = await supabase.rpc("create_room", {
    p_room_code: roomCode,
    p_anonymous: anonymousSubmissions,
    p_word_filter: wordFilter,
    p_host_name: hostName,
    p_host_as_spectator: hostAsSpectator,
  });

  if (error || !data) throw error || new Error("Could not create the room.");

  return {
    room: data.room,
    player: data.player,
    hostToken: data.host_token as string,
    playerToken: (data.player_token || "") as string,
  };
};

export const joinRoom = async (roomCode: string, playerName: string) => {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", roomCode.toUpperCase())
    .eq("status", "waiting")
    .maybeSingle();

  if (roomError || !room) throw new Error("Room not found or already started.");

  if (room.word_filter && containsProfanity(playerName)) {
    throw new Error("That name isn't allowed in this room. Please pick a different one.");
  }

  const { data, error } = await supabase.rpc("join_room", {
    p_room_code: roomCode,
    p_player_name: playerName,
  });

  if (error || !data) throw error || new Error("Could not join the room.");

  return {
    room: data.room,
    player: data.player,
    playerToken: data.player_token as string,
  };
};

export const startMatch = async (roomId: string, hostToken: string) => {
  const { data, error } = await supabase.rpc("start_match", {
    p_room_id: roomId,
    p_host_token: hostToken,
  });

  if (error) throw error;
  return data;
};

export const chooseTheme = async (
  roundId: string,
  playerId: string,
  playerToken: string,
  theme: string
) => {
  const { error } = await supabase.rpc("choose_theme", {
    p_round_id: roundId,
    p_player_id: playerId,
    p_player_token: playerToken,
    p_theme: theme,
  });

  if (error) throw error;
};

export const forceAdvanceToJudging = async (
  roundId: string,
  playerId: string,
  playerToken: string
) => {
  const { error } = await supabase.rpc("force_advance", {
    p_round_id: roundId,
    p_player_id: playerId,
    p_player_token: playerToken,
  });

  if (error) throw error;
};

export const chooseWinners = async (
  roundId: string,
  playerId: string,
  playerToken: string,
  submissionIds: string[]
) => {
  const { error } = await supabase.rpc("choose_winners", {
    p_round_id: roundId,
    p_player_id: playerId,
    p_player_token: playerToken,
    p_submission_ids: submissionIds,
  });

  if (error) throw error;
};

export const declareLie = async (
  roundId: string,
  playerId: string,
  playerToken: string
) => {
  const { error } = await supabase.rpc("declare_lie", {
    p_round_id: roundId,
    p_player_id: playerId,
    p_player_token: playerToken,
  });

  if (error) throw error;
};

export const advanceToNextRound = async (
  roomId: string,
  roundId: string,
  playerId: string,
  playerToken: string,
  hostToken: string
) => {
  const { data, error } = await supabase.rpc("advance_round", {
    p_room_id: roomId,
    p_round_id: roundId,
    p_player_id: playerId || null,
    p_player_token: playerToken || null,
    p_host_token: hostToken || null,
  });

  if (error) throw error;
  return data;
};

export const isLastTurnOfMatch = async (
  roomId: string,
  currentJudgePlayerId: string
): Promise<boolean> => {
  const { data: players, error } = await supabase
    .from("room_players")
    .select("id, has_judged")
    .eq("room_id", roomId);

  if (error || !players) return false;

  const remaining = players.filter(
    (p) => p.id !== currentJudgePlayerId && !p.has_judged
  );
  return remaining.length === 0;
};

export const startNewMatch = async (roomId: string, hostToken: string) => {
  const { data, error } = await supabase.rpc("start_new_match", {
    p_room_id: roomId,
    p_host_token: hostToken,
  });

  if (error) throw error;
  return data;
};

export const showResults = async (roomId: string, hostToken: string) => {
  const { error } = await supabase.rpc("show_results", {
    p_room_id: roomId,
    p_host_token: hostToken,
  });

  if (error) throw error;
};

export const leaveRoom = async (playerId: string, playerToken: string) => {
  const { error } = await supabase.rpc("leave_room", {
    p_player_id: playerId,
    p_player_token: playerToken,
  });

  if (error) throw error;
};

export const removePlayer = async (roomId: string, hostToken: string, playerId: string) => {
  const { error } = await supabase.rpc("remove_player", {
    p_room_id: roomId,
    p_host_token: hostToken,
    p_player_id: playerId,
  });

  if (error) throw error;
};

export const closeRoom = async (roomId: string, hostToken: string) => {
  const { error } = await supabase.rpc("close_room", {
    p_room_id: roomId,
    p_host_token: hostToken,
  });

  if (error) throw error;
};