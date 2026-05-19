import React, { useEffect, useState, useRef } from "react";

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
  // Transparent background
  useEffect(() => {
    document.body.style.background = "transparent";
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
      <div style={{ padding: "20px", fontFamily: "Nunito, sans-serif", color: "#fff2cc", background: "#1155cc", minHeight: "100vh" }}>
        <h2>Writing Phase</h2>
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
            Time is up! Submit your lines.
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
                  color: "white",
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
          Submit Lines
        </button>
      </div>
    );
  };

  // Render reveal phase
  const renderRevealPhase = () => {
    return (
      <div style={{ padding: "20px", fontFamily: "Nunito, sans-serif", color: "#fff2cc", background: "#1155cc", minHeight: "100vh" }}>
        <h2>Submissions</h2>

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
                      color: "white",
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
          Next Round
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

  // Phase rendering
  if (phase === "setup") {
    return (
<div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", textAlign: "center", fontFamily: "Nunito, sans-serif", color: "#fff2cc" }}>        <h1 style={{
  textAlign: "center",
  color: "#fff2cc",
  fontFamily: "Nunito, sans-serif",
  fontWeight: 700,
  background: "transparent",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "50px",
  textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
}}>
  Play Acrosticism Online
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
            background: canContinueFromSetup
              ? "linear-gradient(90deg, #ff7ee5, #7afcff)"
              : "#ccc",
            fontWeight: "bold",
            cursor: canContinueFromSetup ? "pointer" : "not-allowed",
          }}
        >
          Start Round
        </button>
      </div>
    );
  }

  if (phase === "start") {
    return (
      <div style={{ padding: "20px", textAlign: "center", fontFamily: "Nunito, sans-serif", color: "#fff2cc", background: "#1155cc", minHeight: "100vh" }}>
        <h2>Round Setup</h2>
        <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
          Theme is hidden until you begin writing.
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
          Reveal Theme & Start Writing
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