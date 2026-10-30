import React, { useEffect, useState, useRef, useCallback } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";
import { containsProfanity } from "./profanity";

const TIMER_SECONDS = 120;

const saveDraft = (key: string, word: string, lines: string[]) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ word, lines }));
  } catch { }
};

type WritingPhaseOnlineProps = {
  roundId: string;
  playerId: string;
  playerToken: string;
  isJudge: boolean;
  theme: string;
  words: string[];
  wordFilter?: boolean;
  onSubmitted: () => void;
  onForceAdvance: () => void;
};

export default function WritingPhaseOnline({
  roundId,
  playerId,
  playerToken,
  isJudge,
  theme,
  words,
  wordFilter = false,
  onSubmitted,
  onForceAdvance,
}: WritingPhaseOnlineProps) {
  const [assignedWord, setAssignedWord] = useState("");
  const [currentLines, setCurrentLines] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState("");
  const draftKey = `acr_draft_${roundId}_${playerId}`;

  // On load and after a refresh: sync the timer to the server, and for
  // players also check for an existing submission and restore the draft
  useEffect(() => {
    let cancelled = false;

    const getDeadline = async () => {
      const { data: round } = await supabase
        .from("rounds")
        .select("writing_started_at")
        .eq("id", roundId)
        .maybeSingle();
      const { data: serverNow } = await supabase.rpc("server_now");

      const offset = serverNow ? new Date(serverNow).getTime() - Date.now() : 0;
      const startedAt = round?.writing_started_at
        ? new Date(round.writing_started_at).getTime()
        : Date.now() + offset;

      return startedAt + TIMER_SECONDS * 1000 - offset;
    };

    const init = async () => {
      if (isJudge) {
        const judgeDeadline = await getDeadline();
        if (cancelled) return;
        setDeadline(judgeDeadline);
        setReady(true);
        return;
      }

      const { data: existing } = await supabase
        .from("submissions")
        .select("id")
        .eq("round_id", roundId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (cancelled) return;

      if (existing) {
        setHasSubmitted(true);
        setReady(true);
        return;
      }

      let word = "";
      let lines: string[] = [];
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (raw) {
          const saved = JSON.parse(raw);
          word = saved.word || "";
          lines = saved.lines || [];
        }
      } catch { }

      if (!word) {
        if (words.length === 0) return; // words still loading, this runs again when they arrive
        word = words[Math.floor(Math.random() * words.length)] || "";
        lines = new Array(word.length).fill("");
        saveDraft(draftKey, word, lines);
      }

      const playerDeadline = await getDeadline();
      if (cancelled) return;

      setAssignedWord(word);
      setCurrentLines(lines);
      setDeadline(playerDeadline);
      setReady(true);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [roundId, playerId, isJudge, words, draftKey]);

  // Countdown based on the server's start time, so a refresh never resets it
  useEffect(() => {
    if (hasSubmitted || deadline === null) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [isJudge, hasSubmitted, deadline]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const enforceFirstLetter = (targetLetter: string, text: string) => {
    if (!text) return targetLetter.toUpperCase();
    const rest = text.slice(1);
    return targetLetter.toUpperCase() + rest;
  };

  const updateLine = (index: number, value: string) => {
    const correctLetter = assignedWord[index] || "";
    const corrected = enforceFirstLetter(correctLetter, value);
    const updated = [...currentLines];
    updated[index] = corrected;
    setCurrentLines(updated);
    saveDraft(draftKey, assignedWord, updated);
    setSubmitError("");
  };

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;

    if (wordFilter && currentLines.some((line) => containsProfanity(line))) {
      setSubmitError(
        "Please keep it friendly. One of your lines has a word that isn't allowed in this game."
      );
      return;
    }

    submittingRef.current = true;

    const { error } = await supabase.rpc("submit_backronym", {
      p_round_id: roundId,
      p_player_id: playerId,
      p_player_token: playerToken,
      p_word: assignedWord,
      p_lines: currentLines,
    });

    if (error && error.code !== "23505") {
      console.error("Failed to submit:", error.message);
      setSubmitError("Could not submit. Check your connection and tap Submit again.");
      submittingRef.current = false;
      return;
    }

    try {
      sessionStorage.removeItem(draftKey);
    } catch { }
    setSubmitError("");
    setHasSubmitted(true);
    onSubmitted();
  }, [roundId, playerId, playerToken, assignedWord, currentLines, onSubmitted, draftKey, wordFilter]);

  // Auto-submit when the timer hits 0
  useEffect(() => {
    if (
      !isJudge &&
      ready &&
      assignedWord &&
      deadline !== null &&
      timeLeft === 0 &&
      !hasSubmitted
    ) {
      handleSubmit();
    }
  }, [timeLeft, isJudge, ready, assignedWord, deadline, hasSubmitted, handleSubmit]);

  if (!isJudge && !ready) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          fontFamily: "Nunito, sans-serif",
          color: "#fff2cc",
          minHeight: "100vh",
        }}
      >
        <Header />
        Loading...
      </div>
    );
  }
  if (isJudge) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          fontFamily: "Nunito, sans-serif",
          color: "#fff2cc",
          textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
          minHeight: "100vh",
        }}
      >
        <Header />
        <h2>Theme: {theme}</h2>
        {deadline !== null && (
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              marginTop: "16px",
              color: timeLeft <= 30 ? "#ff4444" : timeLeft <= 60 ? "#ffaa00" : "#44cc44",
            }}
          >
            {formatTime(timeLeft)}
          </div>
        )}
        <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
          Players are acrosticizing...
        </p>
        <button
          onClick={onForceAdvance}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
          }}
        >
          Force Continue
        </button>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          fontFamily: "Nunito, sans-serif",
          color: "#fff2cc",
          textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
          minHeight: "100vh",
        }}
      >
        <Header />
        <h2>Submitted! Waiting for other players...</h2>
      </div>
    );
  }

  const timerColor = timeLeft <= 30 ? "#ff4444" : timeLeft <= 60 ? "#ffaa00" : "#44cc44";

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily: "Nunito, sans-serif",
        color: "#fff2cc",
        textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
        minHeight: "100vh",
      }}
    >
      <Header />
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
        {theme}
      </div>
      <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
        Players are acrosticizing their backronyms...
      </p>

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

      {assignedWord.split("").map((letter, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
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
              background: "linear-gradient(135deg, #ff7ee5, #7afcff)",
              borderRadius: "6px",
              marginRight: "10px",
            }}
          >
            {letter.toUpperCase()}
          </div>
          <input
            type="text"
            value={currentLines[i] || ""}
            onChange={(e) => updateLine(i, e.target.value)}
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
      ))}
      {submitError && (
        <div
          style={{
            color: "#ff4444",
            fontWeight: "bold",
            textAlign: "center",
            marginTop: "12px",
          }}
        >
          {submitError}
        </div>
      )}
      <button
        onClick={handleSubmit}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
          fontWeight: "bold",
          cursor: "pointer",
          border: "none",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Submit Backronym
      </button>
    </div>
  );
}