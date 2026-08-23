import React, { useState } from "react";
import Header from "./Header";
import { createRoom, filterRoomCodeWords } from "./roomUtils";

type CreateRoomProps = {
  words: string[];
  onRoomCreated: (roomId: string, roomCode: string, playerId: string, playerName: string) => void;
  onBack: () => void;
};

export default function CreateRoom({ words, onRoomCreated, onBack }: CreateRoomProps) {
  const [hostName, setHostName] = useState("");
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (hostName.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const candidateWords = filterRoomCodeWords(words);
      const { room, player } = await createRoom(hostName.trim(), anonymousSubmissions, candidateWords);
      onRoomCreated(room.id, room.room_code, player.id, player.player_name);
    } catch (err: any) {
      setError(err.message || "Something went wrong creating the room.");
    } finally {
      setLoading(false);
    }
  };

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
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "30px" }}>
        You Are The Host!
      </h1>

      <input
        type="text"
        value={hostName}
        onChange={(e) => setHostName(e.target.value)}
        placeholder="Your name"
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "20px",
          fontSize: "1rem",
        }}
      />

      <div style={{ marginBottom: "20px", textAlign: "left" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={anonymousSubmissions}
            onChange={(e) => setAnonymousSubmissions(e.target.checked)}
          />
          Anonymous Submissions
        </label>
      </div>

      {error && (
        <div style={{ color: "#ff4444", marginBottom: "16px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: loading ? "not-allowed" : "pointer",
          }}
      >
        {loading ? "Creating..." : "Host The Room"}
      </button>

      <button
        onClick={onBack}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: loading ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        Back
      </button>
    </div>
  );
}