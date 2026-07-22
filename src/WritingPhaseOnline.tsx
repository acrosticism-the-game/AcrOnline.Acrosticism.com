import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

const TIMER_SECONDS = 120;

type WritingPhaseOnlineProps = {
  roundId: string;
  playerId: string;
  isJudge: boolean;
  theme: string;
  words: string[];
  onSubmitted: () => void;
};

export default function WritingPhaseOnline({
  roundId,
  playerId,
  isJudge,
  theme,
  words,
  onSubmitted,
}: WritingPhaseOnlineProps) {
  const [assignedWord, setAssignedWord] = useState("");
  const [currentLines, setCurrentLines] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Assign a random word once, when this component mounts (non-Judges only)
  useEffect(() => {
    if (!isJudge && !assignedWord) {
      const randomWord = words[Math.floor(Math.random() * words.length)] || "";
      setAssignedWord(randomWord);
      setCurrentLines(new Array(randomWord.length).fill(""));
    }
  }, [isJudge, assignedWord, words]);

  // Countdown timer
  useEffect(() => {
    if (isJudge || hasSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJudge, hasSubmitted]);

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
  };

  const handleSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const { error } = await supabase.from("submissions").insert({
      round_id: roundId,
      player_id: playerId,
      assigned_word: assignedWord,
      lines: currentLines,
    });

    if (error) {
      console.error("Failed to submit:", error.message);
      return;
    }

    setHasSubmitted(true);
    onSubmitted();
  }, [roundId, playerId, assignedWord, currentLines, onSubmitted]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (!isJudge && timeLeft === 0 && !hasSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isJudge, hasSubmitted, handleSubmit]);
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
        <h2>Theme: {theme}</h2>
        <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
          Players are acrosticizing...
        </p>
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