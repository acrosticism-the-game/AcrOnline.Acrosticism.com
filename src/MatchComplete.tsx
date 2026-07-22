import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type PlayerScore = {
  id: string;
  player_name: string;
  score: number;
};

type MatchCompleteProps = {
  roomId: string;
  onPlayAgain: () => void;
  onBuyNow: () => void;
};

export default function MatchComplete({ roomId, onPlayAgain, onBuyNow }: MatchCompleteProps) {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from("room_players")
        .select("id, player_name, score")
        .eq("room_id", roomId)
        .order("score", { ascending: false });

      if (data) {
        setScores(data);
      }
      setLoading(false);
    };

    fetchScores();
  }, [roomId]);

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
        Loading final results...
      </div>
    );
  }

  const topScore = scores.length > 0 ? scores[0].score : 0;
  const winners = scores.filter((p) => p.score === topScore);

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
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "20px" }}>
         Round Complete!
      </h1>

      <h2 style={{ marginBottom: "10px" }}>
        {winners.length > 1 ? "Winners" : "Winner"}
      </h2>
      <div style={{ fontSize: "1.5rem", marginBottom: "30px", fontWeight: "bold" }}>
        {winners.map((w) => w.player_name).join(" & ")}
      </div>

      <h2 style={{ marginBottom: "10px" }}>Final Scoreboard</h2>
      <div>
        {scores.map((p) => (
          <div key={p.id} style={{ fontSize: "1.2rem", marginBottom: "8px" }}>
            {p.player_name}: {p.score}
          </div>
        ))}
      </div>

      {/* --- NEW BUTTONS --- */}
      <div style={{ marginTop: "40px" }}>
        <button
          onClick={onPlayAgain}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
            fontWeight: "bold",
            cursor: "pointer",
            marginRight: "12px",
            border: "none",
          }}
        >
          Play Again
        </button>

        <button
          onClick={onBuyNow}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
          }}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
