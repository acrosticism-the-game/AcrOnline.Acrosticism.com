import React, { useEffect, useState } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";

type WinningSubmission = {
  assigned_word: string;
  lines: string[];
  player_name: string;
};

type PlayerScore = {
  id: string;
  player_name: string;
  score: number;
};

type RevealScreenProps = {
  roomId: string;
  roundId: string;
  winningSubmissionId: string;
  isJudge: boolean;
  isLastTurn: boolean;
  onNextRound: () => void;
};

export default function RevealScreen({
  roomId,
  roundId,
  winningSubmissionId,
  isJudge,
  isLastTurn,
  onNextRound,
}: RevealScreenProps) {
  const [winner, setWinner] = useState<WinningSubmission | null>(null);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: winningSub } = await supabase
        .from("submissions")
        .select("assigned_word, lines, room_players(player_name)")
        .eq("id", winningSubmissionId)
        .single();

      if (winningSub) {
        setWinner({
          assigned_word: (winningSub as any).assigned_word,
          lines: (winningSub as any).lines,
          player_name: (winningSub as any).room_players?.player_name || "Unknown",
        });
      }

      const { data: players } = await supabase
        .from("room_players")
        .select("id, player_name, score")
        .eq("room_id", roomId)
        .order("score", { ascending: false });

      if (players) {
        setScores(players);
      }

      setLoading(false);
    };

    fetchData();
  }, [roomId, winningSubmissionId]);

  if (loading || !winner) {
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
        Loading results...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
        fontFamily: "Nunito, sans-serif",
        color: "#fff2cc",
        textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
        minHeight: "100vh",
      }}
    >
      <Header />
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "10px" }}>
        Winner!
      </h1>

      <h2 style={{ marginBottom: "20px" }}>{winner.player_name}</h2>

      <div
        style={{
          marginBottom: "30px",
          padding: "16px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.08)",
        }}
      >
        {winner.assigned_word.split("").map((letter, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#000000",
                background: "linear-gradient(135deg, #ff7ee5, #7afcff)",
                borderRadius: "6px",
                marginRight: "10px",
              }}
            >
              {letter.toUpperCase()}
            </div>
            <div style={{ fontSize: "1rem" }}>{winner.lines[i] || ""}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: "10px" }}>Scoreboard</h2>
      <div style={{ marginBottom: "30px" }}>
        {scores.map((p) => (
          <div key={p.id} style={{ fontSize: "1.1rem", marginBottom: "6px" }}>
            {p.player_name}: {p.score}
          </div>
        ))}
      </div>

      {isJudge ? (
        <button
          onClick={onNextRound}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: "pointer",
            border: "none",
          }}
        >
          {isLastTurn ? "End The Round" : "Next Turn"}
        </button>
      ) : (
        <div>Waiting for the Judge to pass the role...</div>
      )}
    </div>
  );
}