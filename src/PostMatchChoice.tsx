import React from "react";
import { supabase } from "./supabaseClient";

type PostMatchChoiceProps = {
  isHost: boolean;
  roomId: string;
  onNewMatch: () => void;
  onShowResults: () => void;
};

export default function PostMatchChoice({
  isHost,
  roomId,
  onNewMatch,
  onShowResults,
}: PostMatchChoiceProps) {
  if (!isHost) {
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
        <h2>Round complete! Waiting for the host to decide what's next...</h2>
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
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "30px" }}>
        Round Complete!
      </h1>

      <button
        onClick={onNewMatch}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: "pointer",
          border: "none",
        }}
      >
        New Round
      </button>

      <button
        onClick={async () => {
          await supabase
            .from("rooms")
            .update({ viewing_results: true })
            .eq("id", roomId);

          onShowResults();
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: "pointer",
          border: "none",
        }}
      >
        Show Results Page
      </button>
    </div>
  );
}