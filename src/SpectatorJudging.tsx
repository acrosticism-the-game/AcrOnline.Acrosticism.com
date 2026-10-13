import React, { useEffect, useState } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";
import { seededShuffle } from "./seededShuffle";

type Submission = {
  id: string;
  assigned_word: string;
  lines: string[];
  player_name?: string;
};

type SpectatorJudgingProps = {
  roundId: string;
  anonymousSubmissions: boolean;
  theme: string;
};

export default function SpectatorJudging({
  roundId,
  anonymousSubmissions,
  theme,
}: SpectatorJudgingProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, assigned_word, lines, room_players(player_name)")
        .eq("round_id", roundId);

      if (!error && data) {
        const formatted = data.map((s: any) => ({
          id: s.id,
          assigned_word: s.assigned_word,
          lines: s.lines,
          player_name: s.room_players?.player_name,
        }));
        const stable = [...formatted].sort((a, b) => a.id.localeCompare(b.id));
        setSubmissions(seededShuffle(stable, roundId));
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [roundId]);

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "900px",
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
        The Judge is deciding...
      </h1>

      <div
        style={{
          marginBottom: "24px",
          fontSize: "1.6rem",
          padding: "12px",
          borderRadius: "10px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          color: "#000000",
          textShadow: "none",
        }}
      >
        {theme}
      </div>

      {loading && <div>Loading submissions...</div>}

      {submissions.map((sub, subIndex) => (
        <div
          key={sub.id}
          style={{
            marginBottom: "24px",
            padding: "16px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.08)",
            textAlign: "left",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>
            {anonymousSubmissions ? `Submission ${subIndex + 1}` : sub.player_name}
          </h3>

          {sub.assigned_word.split("").map((letter, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: "#000000",
                  textShadow: "none",
                  background: "linear-gradient(135deg, #ff7ee5, #7afcff)",
                  borderRadius: "6px",
                  marginRight: "10px",
                  flexShrink: 0,
                }}
              >
                {letter.toUpperCase()}
              </div>
              <div style={{ fontSize: "1.2rem" }}>{sub.lines[i] || ""}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}