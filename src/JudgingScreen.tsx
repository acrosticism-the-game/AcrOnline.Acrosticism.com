import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Submission = {
  id: string;
  player_id: string;
  assigned_word: string;
  lines: string[];
  player_name?: string;
};

type JudgingScreenProps = {
  roundId: string;
  isJudge: boolean;
  anonymousSubmissions: boolean;
  theme: string;
  onWinnerChosen: (submissionId: string) => void;
};

export default function JudgingScreen({
  roundId,
  isJudge,
  anonymousSubmissions,
  theme,
  onWinnerChosen,
}: JudgingScreenProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, player_id, assigned_word, lines, room_players(player_name)")
        .eq("round_id", roundId);

      if (!error && data) {
        const formatted = data.map((s: any) => ({
          id: s.id,
          player_id: s.player_id,
          assigned_word: s.assigned_word,
          lines: s.lines,
          player_name: s.room_players?.player_name,
        }));

        // Shuffle so submission order doesn't hint at anything
        const shuffled = [...formatted].sort(() => Math.random() - 0.5);
        setSubmissions(shuffled);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [roundId]);
  if (!isJudge) {
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
        <h2>The Judge is reviewing backronyms...</h2>
      </div>
    );
  }

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
        Loading submissions...
      </div>
    );
  }

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
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "10px" }}>
        You're Judging!
      </h1>
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
      <p style={{ marginBottom: "20px" }}>Pick your favorite backronym.</p>

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
          <h3 style={{ marginBottom: "10px" }}>
            {anonymousSubmissions ? `Submission ${subIndex + 1}` : sub.player_name}
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
                  background: "linear-gradient(135deg, #ff7ee5, #7afcff)",
                  borderRadius: "6px",
                  marginRight: "10px",
                }}
              >
                {letter.toUpperCase()}
              </div>
              <div style={{ fontSize: "1rem" }}>{sub.lines[i] || ""}</div>
            </div>
          ))}

          <button
            onClick={() => onWinnerChosen(sub.id)}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
              fontWeight: "bold",
              cursor: "pointer",
              border: "none",
            }}
          >
            Winner
          </button>
        </div>
      ))}
    </div>
  );
}