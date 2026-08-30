import React, { useEffect, useState } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";

type Submission = {
  id: string;
  player_id: string;
  assigned_word: string;
  lines: string[];
  player_name: string;
  is_winner: boolean;
};

type PlayerScore = {
  id: string;
  player_name: string;
  score: number;
};

type RevealScreenProps = {
  roomId: string;
  roundId: string;
  isJudge: boolean;
  isLastTurn: boolean;
  onNextRound: () => void;
};

export default function RevealScreen({
  roomId,
  roundId,
  isJudge,
  isLastTurn,
  onNextRound,
}: RevealScreenProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: subs } = await supabase
        .from("submissions")
        .select("id, player_id, assigned_word, lines, is_winner, room_players(player_name)")
        .eq("round_id", roundId);

      if (subs) {
        const formatted = subs.map((s: any) => ({
          id: s.id,
          player_id: s.player_id,
          assigned_word: s.assigned_word,
          lines: s.lines,
          is_winner: s.is_winner,
          player_name: s.room_players?.player_name || "Unknown",
        }));
        setSubmissions(formatted);
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
  }, [roomId, roundId]);

  if (loading) {
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

  const winnerCount = submissions.filter((s) => s.is_winner).length;
  const headline =
    winnerCount === 0
      ? "It's A Lie! No winner this turn."
      : winnerCount === 1
      ? "We Have A Winner!"
      : "It's A Tie!";

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "700px",
        margin: "0 auto",
        textAlign: "center",
        fontFamily: "Nunito, sans-serif",
        color: "#fff2cc",
        textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
        minHeight: "100vh",
      }}
    >
      <Header />
      <h1 style={{ fontWeight: 700, fontSize: "36px", marginBottom: "20px" }}>
        {headline}
      </h1>

      {submissions.map((sub) => (
        <div
          key={sub.id}
          style={{
            marginBottom: "24px",
            padding: "16px",
            borderRadius: "10px",
            background: sub.is_winner ? "rgba(255, 215, 0, 0.18)" : "rgba(255,255,255,0.08)",
            border: sub.is_winner ? "2px solid gold" : "2px solid transparent",
            textAlign: "left",
          }}
        >
          <h3 style={{ marginBottom: "10px" }}>
            {sub.is_winner ? "🏆 " : ""}
            {sub.player_name}
          </h3>

          {sub.assigned_word.split("").map((letter, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
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
                  background: sub.is_winner
                    ? "linear-gradient(135deg, gold, #ffec8b)"
                    : "linear-gradient(135deg, #ff7ee5, #7afcff)",
                  borderRadius: "6px",
                  marginRight: "10px",
                }}
              >
                {letter.toUpperCase()}
              </div>
              <div style={{ fontSize: "1rem" }}>{sub.lines[i] || ""}</div>
            </div>
          ))}
        </div>
      ))}

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