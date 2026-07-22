import { supabase } from "./supabaseClient";

// Filter words to valid room-code length (3–7 letters, alphabetic only)
export const filterRoomCodeWords = (words: string[]): string[] => {
  return words.filter((w) => {
    const clean = w.trim();
    return clean.length >= 3 && clean.length <= 7 && /^[a-zA-Z]+$/.test(clean);
  });
};

// Pick a random word and try to create a room with it; retry on collision
export const generateUniqueRoomCode = async (
  candidateWords: string[],
  maxAttempts = 10
): Promise<string | null> => {
  const shuffled = [...candidateWords].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(maxAttempts, shuffled.length); i++) {
    const code = shuffled[i].toUpperCase();
    const { data } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", code)
      .maybeSingle();

    if (!data) {
      return code; // no existing room with this code — safe to use
    }
  }

  return null; // ran out of attempts, extremely unlikely
};

export const createRoom = async (
  hostName: string,
  anonymousSubmissions: boolean,
  candidateWords: string[]
) => {
  const roomCode = await generateUniqueRoomCode(candidateWords);
  if (!roomCode) throw new Error("Could not generate a unique room code. Try again.");

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ room_code: roomCode, anonymous_submissions: anonymousSubmissions })
    .select()
    .single();

  if (roomError || !room) throw roomError;

  const { data: player, error: playerError } = await supabase
    .from("room_players")
    .insert({ room_id: room.id, player_name: hostName })
    .select()
    .single();

  if (playerError || !player) throw playerError;

  return { room, player };
};

export const joinRoom = async (roomCode: string, playerName: string) => {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", roomCode.toUpperCase())
    .eq("status", "waiting")
    .maybeSingle();

  if (roomError || !room) throw new Error("Room not found or already started.");

  const { data: player, error: playerError } = await supabase
    .from("room_players")
    .insert({ room_id: room.id, player_name: playerName })
    .select()
    .single();

  if (playerError || !player) throw playerError;

  return { room, player };
};

export const startMatch = async (roomId: string) => {
  // Get all players in this room
  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError || !players || players.length < 3) {
    throw new Error("Could not start match — not enough players found.");
  }

  // Pick a random judge
  const judge = players[Math.floor(Math.random() * players.length)];

  // Create the first round of match 1
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      round_number: 1,
      judge_player_id: judge.id,
      phase: "theme_select",
      match_number: 1,
    })
    .select()
    .single();

  if (roundError || !round) throw roundError;

  // Mark room as in progress + stamp match_number
  const { error: roomError } = await supabase
    .from("rooms")
    .update({
      status: "in_progress",
      current_round_id: round.id,
      match_number: 1,
    })
    .eq("id", roomId);

  if (roomError) throw roomError;

  return round;
};

export const chooseTheme = async (roundId: string, theme: string) => {
  const { error } = await supabase
    .from("rounds")
    .update({
      theme: theme,
      theme_revealed: true,
      phase: "writing",
      writing_started_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) throw error;
};

export const checkAndAdvanceToJudging = async (roomId: string, roundId: string, judgePlayerId: string) => {
  // Count total players in the room
  const { data: allPlayers, error: playersError } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError || !allPlayers) throw playersError;

  const nonJudgeCount = allPlayers.filter((p) => p.id !== judgePlayerId).length;

  // Count submissions for this round
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id")
    .eq("round_id", roundId);

  if (submissionsError || !submissions) throw submissionsError;

  // If everyone (except the Judge) has submitted, advance the phase
  if (submissions.length >= nonJudgeCount) {
    const { error: updateError } = await supabase
      .from("rounds")
      .update({ phase: "judging" })
      .eq("id", roundId);

    if (updateError) throw updateError;
  }
};

export const chooseWinner = async (roundId: string, submissionId: string, winningPlayerId: string) => {
  // Save the winning submission on the round
  const { error: roundError } = await supabase
    .from("rounds")
    .update({ winning_submission_id: submissionId, phase: "reveal" })
    .eq("id", roundId);

  if (roundError) throw roundError;

  // Increment the winning player's score
  const { data: player, error: fetchError } = await supabase
    .from("room_players")
    .select("score")
    .eq("id", winningPlayerId)
    .single();

  if (fetchError || !player) throw fetchError;

  const { error: scoreError } = await supabase
    .from("room_players")
    .update({ score: player.score + 1 })
    .eq("id", winningPlayerId);

  if (scoreError) throw scoreError;
};
export const advanceToNextRound = async (roomId: string, previousJudgePlayerId: string) => {
  // Mark the previous judge as having judged
  const { error: markJudgedError } = await supabase
    .from("room_players")
    .update({ has_judged: true })
    .eq("id", previousJudgePlayerId);

  if (markJudgedError) throw markJudgedError;

  // Get all players
  const { data: allPlayers, error: playersError } = await supabase
    .from("room_players")
    .select("id, has_judged")
    .eq("room_id", roomId);

  if (playersError || !allPlayers) throw playersError;

  const remainingPlayers = allPlayers.filter((p) => !p.has_judged);

  if (remainingPlayers.length === 0) {
    // Everyone has judged — match is complete
    const { error: completeError } = await supabase
      .from("rooms")
      .update({ status: "match_complete" })
      .eq("id", roomId);

    if (completeError) throw completeError;
    return { matchComplete: true };
  }

  // Fetch current match_number
  const { data: room, error: roomFetchError } = await supabase
    .from("rooms")
    .select("match_number")
    .eq("id", roomId)
    .single();

  if (roomFetchError || !room) throw roomFetchError;

  const newJudge = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];

  // Get highest round_number for THIS match only
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("room_id", roomId)
    .eq("match_number", room.match_number)
    .order("round_number", { ascending: false })
    .limit(1);

  if (roundsError) throw roundsError;

  const nextRoundNumber = (rounds?.[0]?.round_number || 0) + 1;

  // Create next round
  const { data: newRound, error: newRoundError } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      round_number: nextRoundNumber,
      judge_player_id: newJudge.id,
      phase: "theme_select",
      match_number: room.match_number,
    })
    .select()
    .single();

  if (newRoundError || !newRound) throw newRoundError;

  return { matchComplete: false, round: newRound };
};

export const isLastTurnOfMatch = async (roomId: string, currentJudgePlayerId: string): Promise<boolean> => {
  const { data: players, error } = await supabase
    .from("room_players")
    .select("id, has_judged")
    .eq("room_id", roomId);

  if (error || !players) return false;

  const remaining = players.filter((p) => p.id !== currentJudgePlayerId && !p.has_judged);
  return remaining.length === 0;
};

export const startNewMatch = async (roomId: string) => {
  // Reset has_judged for all players
  const { error: resetError } = await supabase
    .from("room_players")
    .update({ has_judged: false })
    .eq("room_id", roomId);

  if (resetError) throw resetError;

  // Get current match_number
  const { data: room, error: roomFetchError } = await supabase
    .from("rooms")
    .select("match_number")
    .eq("id", roomId)
    .single();

  if (roomFetchError || !room) throw roomFetchError;

  const newMatchNumber = room.match_number + 1;

  // Update room to new match_number
  const { error: roomUpdateError } = await supabase
    .from("rooms")
    .update({
      status: "in_progress",
      match_number: newMatchNumber,
    })
    .eq("id", roomId);

  if (roomUpdateError) throw roomUpdateError;

  // Pick a random judge
  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError || !players) throw playersError;

  const judge = players[Math.floor(Math.random() * players.length)];

  // Create round 1 of the new match
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      round_number: 1,
      judge_player_id: judge.id,
      phase: "theme_select",
      match_number: newMatchNumber,
    })
    .select()
    .single();

  if (roundError || !round) throw roundError;

  // Update room's current_round_id
  const { error: roomError } = await supabase
    .from("rooms")
    .update({ current_round_id: round.id })
    .eq("id", roomId);

  if (roomError) throw roomError;

  return round;
};
