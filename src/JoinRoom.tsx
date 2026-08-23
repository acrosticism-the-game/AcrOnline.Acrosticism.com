import React, { useState } from "react";
import Header from "./Header";
import { joinRoom } from "./roomUtils";

type JoinRoomProps = {
  onRoomJoined: (roomId: string, roomCode: string, playerId: string, playerName: string) => void;
  onBack: () => void;
};

export default function JoinRoom({ onRoomJoined, onBack }: JoinRoomProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (playerName.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }
    if (roomCode.trim().length === 0) {
      setError("Please enter a room code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { room, player } = await joinRoom(roomCode.trim(), playerName.trim());
      onRoomJoined(room.id, room.room_code, player.id, player.player_name);
    } catch (err: any) {
      setError(err.message || "Something went wrong joining the room.");
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
        Join The Game
      </h1>

      <input
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Your name"
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "16px",
          fontSize: "1rem",
        }}
      />

      <input
        type="text"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Room code"
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "20px",
          fontSize: "1rem",
          textTransform: "uppercase",
        }}
      />

      {error && (
        <div style={{ color: "#ff4444", marginBottom: "16px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={loading}
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
        {loading ? "Joining..." : "Join The Host"}
      </button>

      <button
        onClick={onBack}
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
          border: "none",
        }}
      >
        Back
      </button>
    </div>
  );
}