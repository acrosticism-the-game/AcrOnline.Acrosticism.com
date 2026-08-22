import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import OnlineLanding from "./OnlineLanding";
import CreateRoom from "./CreateRoom";
import JoinRoom from "./JoinRoom";
import WaitingLobby from "./WaitingLobby";
import { startMatch } from "./roomUtils";
import { chooseTheme, checkAndAdvanceToJudging, chooseWinner, advanceToNextRound, isLastTurnOfMatch, startNewMatch } from "./roomUtils";
import ThemeSelect from "./ThemeSelect";
import WritingPhaseOnline from "./WritingPhaseOnline";
import JudgingScreen from "./JudgingScreen";
import RevealScreen from "./RevealScreen";
import MatchComplete from "./MatchComplete";
import PostMatchChoice from "./PostMatchChoice";
import TrueHome from "./TrueHome";

// Google Sheets CSV URLs
const WORDS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTp4cZ6kcgitCy2LF9tVrIIc3tSGHw7psHIKqR7mJX-FLwFdl2evJlMDsj164KEIITIWOC-7Q9r4L3/pub?gid=0&output=csv";

const THEMES_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTp4cZ6kcgitCy2LF9tVrIIc3tSGHw7psHIKqR7mJX-FLwFdl2evJlMDsj164KEIITIWOC-7Q9r4L3/pub?gid=750964402&output=csv";

// Utility: parse CSV into array of strings
const parseCSV = (csv: string) => {
  const lines = csv.trim().split("\n");
  const rows = lines.slice(1);
  return rows
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
};

type Phase = "setup" | "start" | "writing" | "reveal";
type ThemeMode = "random" | "custom";

const TIMER_SECONDS = 120;

export default function AcrOnline() {
  // App background
  useEffect(() => {
    document.body.style.background = "#0d1b3d";
  }, []);

  // Core state
  const [players, setPlayers] = useState<string[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("setup");

  const [themeMode, setThemeMode] = useState<ThemeMode>("random");
  const [customTheme, setCustomTheme] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [themeRevealed, setThemeRevealed] = useState<boolean>(false);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [playerWords, setPlayerWords] = useState<string[]>([]);
  const [currentLines, setCurrentLines] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, string[]>>({});

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(TIMER_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Online mode state
  const [mode, setMode] = useState<"trueHome" | "local" | "onlineLanding" | "onlineCreate" | "onlineJoin" | "onlineLobby" | "onlineRound">("trueHome");
  const [onlineRoomId, setOnlineRoomId] = useState("");
  const [onlineRoomCode, setOnlineRoomCode] = useState("");
  const [onlinePlayerId, setOnlinePlayerId] = useState("");
  const [onlineIsHost, setOnlineIsHost] = useState(false);
  const [currentRound, setCurrentRound] = useState<{
    id: string;
    phase: string;
    judge_player_id: string;
    theme: string | null;
    winning_submission_id: string | null;
  } | null>(null);
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(true);
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [isLastTurn, setIsLastTurn] = useState(false);
  const [matchNumber, setMatchNumber] = useState(1);
  const [showResultsPage, setShowResultsPage] = useState(false);

  useEffect(() => {
    if (!onlineRoomId) return;

    const fetchCurrentRound = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("anonymous_submissions, status, match_number")
        .eq("id", onlineRoomId)
        .maybeSingle();

      if (!roomData) return;

      setAnonymousSubmissions(roomData.anonymous_submissions);
      setRoomStatus(roomData.status);
      setMatchNumber(roomData.match_number);

      const { data } = await supabase
        .from("rounds")
        .select("id, phase, judge_player_id, theme, winning_submission_id")
        .eq("room_id", onlineRoomId)
        .eq("match_number", roomData.match_number)
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();


      if (data) {
        setCurrentRound(data);
        setMode("onlineRound");
      }
    };

    const channel = supabase
      .channel(`rounds-${onlineRoomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${onlineRoomId}` },
        () => {
          fetchCurrentRound();
        }
      )
      .subscribe();

    fetchCurrentRound();
    

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onlineRoomId]);

  useEffect(() => {
    if (currentRound && currentRound.phase === "reveal") {
      isLastTurnOfMatch(onlineRoomId, currentRound.judge_player_id).then(setIsLastTurn);
    }
  }, [currentRound, onlineRoomId]);
  useEffect(() => {
    if (!onlineRoomId) return;

const roomChannel = supabase
  .channel(`room-status-${onlineRoomId}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "rooms", filter: `id=eq.${onlineRoomId}` },
    (payload: any) => {
      if (payload.new) {
        setRoomStatus(payload.new.status);
        setAnonymousSubmissions(payload.new.anonymous_submissions);
        setMatchNumber(payload.new.match_number);

        setShowResultsPage(payload.new.viewing_results);
      }
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(roomChannel);
};
}, [onlineRoomId]);

  // Fetch words and themes from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const wordsRes = await fetch(WORDS_CSV);
        const wordsText = await wordsRes.text();
        const parsedWords = parseCSV(wordsText);

        const themesRes = await fetch(THEMES_CSV);
        const themesText = await themesRes.text();
        const parsedThemes = parseCSV(themesText);

        setWords(parsedWords);
        setThemes(parsedThemes);
      } catch (err) {
        console.error("Error loading Google Sheets:", err);
      }
    };

    fetchData();
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timeLeft]);

  const startTimer = () => {
    setTimeLeft(TIMER_SECONDS);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Shuffle helper
  const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);

  // Effective theme
  const effectiveTheme =
    themeMode === "custom" && customTheme.trim().length > 0
      ? customTheme.trim()
      : selectedTheme;

  // Add a player (max 6)
  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([...players, ""]);
    }
  };

  // Update player name
  const updatePlayerName = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const canContinueFromSetup =
    players.length > 0 && players.every((p) => p.trim().length > 0) &&
    (themeMode === "random" || customTheme.trim().length > 0);

  // Begin round setup
  const beginStartSetup = () => {
    if (!canContinueFromSetup) return;
    if (words.length < players.length) {
      console.warn("Not enough words loaded for all players.");
      return;
    }

    const shuffledWords = shuffle(words);
    const assigned = shuffledWords.slice(0, players.length);
    setPlayerWords(assigned);

    const randomTheme =
      themes[Math.floor(Math.random() * themes.length)] || "";
    setSelectedTheme(randomTheme);

    setCurrentPlayerIndex(0);
    setSubmissions({});
    setCurrentLines([]);
    setThemeRevealed(false);
    setPhase("start");
  };

  // Reveal theme and move into writing phase
  const startWritingPhase = () => {
    setThemeRevealed(true);
    setPhase("writing");
    setCurrentLines([]);
    startTimer();
  };

  // Auto-correct first letter
  const enforceFirstLetter = (targetLetter: string, text: string) => {
    if (!text) return targetLetter.toUpperCase();
    const rest = text.slice(1);
    return targetLetter.toUpperCase() + rest;
  };

  // Handle typing for a single line
  const updateLine = (index: number, value: string, word: string) => {
    const correctLetter = word[index] || "";
    const corrected = enforceFirstLetter(correctLetter, value);
    const updated = [...currentLines];
    updated[index] = corrected;
    setCurrentLines(updated);
  };

  // Submit lines for current player
  const submitPlayerLines = () => {
    stopTimer();
    const playerName = players[currentPlayerIndex];
    const updatedSubmissions = { ...submissions, [playerName]: currentLines };
    setSubmissions(updatedSubmissions);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setCurrentLines([]);
      startTimer();
    } else {
      setPhase("reveal");
    }
  };

  // Next round
  const nextRound = () => {
    if (players.length === 0) {
      setPhase("setup");
      return;
    }

    if (words.length < players.length) {
      console.warn("Not enough words loaded for all players.");
      setPhase("setup");
      return;
    }

    const shuffledWords = shuffle(words);
    const assigned = shuffledWords.slice(0, players.length);
    setPlayerWords(assigned);

    const randomTheme =
      themes[Math.floor(Math.random() * themes.length)] || "";
    setSelectedTheme(randomTheme);

    setCurrentPlayerIndex(0);
    setSubmissions({});
    setCurrentLines([]);
    setThemeRevealed(false);
    setPhase("start");
  };

  // Render writing phase
  const renderWritingPhase = () => {
    const currentPlayer = players[currentPlayerIndex];
    const currentWord = playerWords[currentPlayerIndex] || "";
    const timerColor = timeLeft <= 30 ? "#ff4444" : timeLeft <= 60 ? "#ffaa00" : "#44cc44";

    return (
      <div style={{ padding: "20px", fontFamily: "Nunito, sans-serif", color: "#fff2cc", textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc", background: "transparent", minHeight: "100vh" }}>
        <h2>Acrosticize your Word! You have 2 minutes.</h2>
        <h3>Player: {currentPlayer}</h3>

        {/* Timer */}
        <div
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: timerColor,
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          {formatTime(timeLeft)}
        </div>

        {timeLeft === 0 && (
          <div
            style={{
              color: "#ff4444",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "12px",
              fontSize: "1.2rem",
            }}
          >
            Time is up! Submit your backronym.
          </div>
        )}

        {themeRevealed && effectiveTheme && (
          <div
            style={{
              marginBottom: "20px",
              fontSize: "1.2rem",
              padding: "10px",
              borderRadius: "8px",
              background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            {effectiveTheme}
          </div>
        )}

        {currentWord.split("").map((letter, i) => {
          const accent = "linear-gradient(135deg, #ff7ee5, #7afcff)";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: "#000000",
                  background: accent,
                  borderRadius: "6px",
                  marginRight: "10px",
                }}
              >
                {letter.toUpperCase()}
              </div>

              <input
                type="text"
                value={currentLines[i] || ""}
                onChange={(e) => updateLine(i, e.target.value, currentWord)}
                placeholder="Type your line..."
                style={{
                  flex: 1,
                  padding: "10px",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          );
        })}

        <button
          onClick={submitPlayerLines}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Submit Backronym
        </button>
      </div>
    );
  };

  // Render reveal phase
  const renderRevealPhase = () => {
    return (
      <div style={{ padding: "20px", fontFamily: "Nunito, sans-serif", color: "#fff2cc", textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc", background: "transparent", minHeight: "100vh" }}>
        <h2>Time to judge your submissions!</h2>

        {effectiveTheme && (
          <div
            style={{
              marginBottom: "20px",
              fontSize: "1.2rem",
              padding: "10px",
              borderRadius: "8px",
              background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            Theme: {effectiveTheme}
          </div>
        )}

        {players.map((player, idx) => {
          const word = playerWords[idx] || "";
          const lines = submissions[player] || [];
          const accent = "linear-gradient(135deg, #ff7ee5, #7afcff)";

          return (
            <div key={idx} style={{ marginBottom: "20px" }}>
              <h3>{player}</h3>
              {word.split("").map((letter, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                      color: "#000000",
                      background: accent,
                      borderRadius: "6px",
                      marginRight: "10px",
                    }}
                  >
                    {letter.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "1rem" }}>
                    {lines[i] || ""}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <button
          onClick={nextRound}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Next Turn
        </button>

        <button
  onClick={() => {
    setPlayers([]);
    setPlayerWords([]);
    setSubmissions({});
    setCurrentLines([]);
    setCurrentPlayerIndex(0);
    setPhase("setup");
  }}
  style={{
    marginTop: "20px",
    marginLeft: "10px",
    padding: "10px 20px",
    borderRadius: "8px",
    background: "linear-gradient(270deg, #ff7ee5, #7afcff)",
    color: "#000000",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
  }}
>
  New Game
</button>
      </div>
    );
  };

  if (mode === "trueHome") {
    return (
      <TrueHome
        onSelectPassAndPlay={() => setMode("local")}
        onSelectOnline={() => setMode("onlineLanding")}
      />
    );
  }

  // Online mode rendering
  if (mode === "onlineLanding") {
    return (
      <OnlineLanding
        onSelectCreate={() => setMode("onlineCreate")}
        onSelectJoin={() => setMode("onlineJoin")}
        onBackToHome={() => setMode("trueHome")}
      />
    );
  }

  if (mode === "onlineCreate") {
    return (
      <CreateRoom
        words={words}
        onRoomCreated={(roomId, roomCode, playerId, playerName) => {
          setOnlineRoomId(roomId);
          setOnlineRoomCode(roomCode);
          setOnlinePlayerId(playerId);
          setOnlineIsHost(true);
          setMode("onlineLobby");
        }}
        onBack={() => setMode("onlineLanding")}
      />
    );
  }

  if (mode === "onlineJoin") {
    return (
      <JoinRoom
        onRoomJoined={(roomId, roomCode, playerId, playerName) => {
          setOnlineRoomId(roomId);
          setOnlineRoomCode(roomCode);
          setOnlinePlayerId(playerId);
          setOnlineIsHost(false);
          setMode("onlineLobby");
        }}
        onBack={() => setMode("onlineLanding")}
      />
    );
  }

  if (mode === "onlineLobby") {
    return (
      <WaitingLobby
        roomId={onlineRoomId}
        roomCode={onlineRoomCode}
        playerId={onlinePlayerId}
        isHost={onlineIsHost}
        onStartMatch={async () => {
          try {
            await startMatch(onlineRoomId);
          } catch (err: any) {
            console.error("Failed to start match:", err.message);
          }
        }}
      />
    );
  }
  if (mode === "onlineRound" && roomStatus === "match_complete") {
    if (matchNumber >= 3 || showResultsPage) {
      return (
  <MatchComplete
    roomId={onlineRoomId}
    onPlayAgain={() => {
      setMode("onlineLanding");
      setShowResultsPage(false);
      setOnlineRoomId("");
      setOnlineRoomCode("");
      setOnlinePlayerId("");
      setMatchNumber(1);
    }}
    onBuyNow={() => {
      window.location.href = "https://shop.acrosticism.com";
    }}
  />
);
    }

    return (
      <PostMatchChoice
  isHost={onlineIsHost}
  roomId={onlineRoomId}
  onNewMatch={async () => {
    try {
      await startNewMatch(onlineRoomId);
      setShowResultsPage(false);
    } catch (err: any) {
      console.error("Failed to start new match:", err.message);
    }
  }}
  onShowResults={() => setShowResultsPage(true)}
/>
    );
  }
  if (mode === "onlineRound" && currentRound) {
    const isJudge = currentRound.judge_player_id === onlinePlayerId;

    if (currentRound.phase === "theme_select") {
      return (
        <ThemeSelect
          isJudge={isJudge}
          themes={themes}
          onThemeChosen={async (theme) => {
            try {
              await chooseTheme(currentRound.id, theme);
            } catch (err: any) {
              console.error("Failed to choose theme:", err.message);
            }
          }}
        />
      );
    }

if (currentRound.phase === "writing") {
      return (
        <WritingPhaseOnline
          roundId={currentRound.id}
          playerId={onlinePlayerId}
          isJudge={isJudge}
          theme={currentRound.theme || ""}
          words={words}
          onSubmitted={async () => {
            try {
              await checkAndAdvanceToJudging(onlineRoomId, currentRound.id, currentRound.judge_player_id);
            } catch (err: any) {
              console.error("Failed to check/advance to judging:", err.message);
            }
          }}
        />
      );
    }

    if (currentRound.phase === "judging") {
      return (
        <JudgingScreen
          roundId={currentRound.id}
          isJudge={isJudge}
          anonymousSubmissions={anonymousSubmissions}
          theme={currentRound.theme || ""}
          onWinnerChosen={async (submissionId) => {
            try {
              const { data: sub } = await supabase
                .from("submissions")
                .select("player_id")
                .eq("id", submissionId)
                .single();

              if (sub) {
                await chooseWinner(currentRound.id, submissionId, sub.player_id);
              }
            } catch (err: any) {
              console.error("Failed to choose winner:", err.message);
            }
          }}
        />
      );
    }

    if (currentRound.phase === "reveal") {
      return (
        <RevealScreen
          roomId={onlineRoomId}
          roundId={currentRound.id}
          winningSubmissionId={currentRound.winning_submission_id || ""}
          isJudge={isJudge}
          isLastTurn={isLastTurn}
          onNextRound={async () => {
            try {
              await advanceToNextRound(onlineRoomId, currentRound.judge_player_id);
            } catch (err: any) {
              console.error("Failed to advance to next round:", err.message);
            }
          }}
        />
      );
    }

    return (
      <div style={{ color: "#fff2cc", padding: "20px", textAlign: "center" }}>
        Turn phase "{currentRound.phase}" not yet built.
      </div>
    );
  }

  // Phase rendering
  if (phase === "setup") {
    return (
<div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", textAlign: "center", fontFamily: "Nunito, sans-serif", color: "#fff2cc", textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc"}}>        <h1 style={{
  textAlign: "center",
  color: "#fff2cc",
  fontFamily: "Nunito, sans-serif",
  fontWeight: 700,
  textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "50px",
}}>
  Play Acrosticism With Friends!
</h1>

        <h2>Players</h2>
{players.map((player, idx) => (
  <div key={idx} style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
    <input
      type="text"
      value={player}
      onChange={(e) => updatePlayerName(idx, e.target.value)}
      placeholder={`Player ${idx + 1} name`}
      style={{
        flex: 1,
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
      }}
    />
    <button
      onClick={() => setPlayers(players.filter((_, i) => i !== idx))}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        background: "#ff4444",
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        border: "none",
      }}
    >
      ✕
    </button>
  </div>
))}
        <button
          onClick={addPlayer}
          disabled={players.length >= 6}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: players.length >= 6 ? "not-allowed" : "pointer",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
          }}
        >
          Add Player
        </button>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <h2>Theme</h2>
          <div style={{ marginBottom: "8px" }}>
            <label>
              <input
                type="radio"
                value="random"
                checked={themeMode === "random"}
                onChange={() => setThemeMode("random")}
                style={{ marginRight: "8px" }}
              />
              Random Theme
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                value="custom"
                checked={themeMode === "custom"}
                onChange={() => setThemeMode("custom")}
                style={{ marginRight: "8px" }}
              />
              Custom Theme
            </label>
          </div>

          {themeMode === "custom" && (
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Enter custom theme..."
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          )}
        </div>

        <button
          onClick={beginStartSetup}
          disabled={!canContinueFromSetup}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            textShadow: canContinueFromSetup
              ? "0 0 20px #1155cc, 0 0 40px #1155cc"
              : "none",
            fontWeight: "bold",
            cursor: canContinueFromSetup ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          Start Game
        </button>
<button
          onClick={() => setMode("trueHome")}
          style={{
            marginTop: "20px",
            marginLeft: "10px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
          }}
        >
         Go Back
        </button>
      </div>
    );
  }
  
  if (phase === "start") {
    return (
      <div style={{ padding: "20px", textAlign: "center", fontFamily: "Nunito, sans-serif", color: "#fff2cc", textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc", background: "transparent", minHeight: "100vh" }}>
        <h2>Get Ready!</h2>
        <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
          The theme is hidden until you begin acrosticizing.
        </p>
        <button
          onClick={startWritingPhase}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Reveal Theme & Start Acrosticizing
        </button>
      </div>
    );
  }

  if (phase === "writing") {
    return renderWritingPhase();
  }

  if (phase === "reveal") {
    return renderRevealPhase();
  }

  return null;
}