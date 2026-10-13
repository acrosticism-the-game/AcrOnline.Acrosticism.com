import React, { useState } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";
import { joinRoom } from "./roomUtils";
import { Role } from "./session";

type JoinRoomProps = {
  onRoomJoined: (
    roomId: string,
    roomCode: string,
    playerId: string,
    playerName: string,
    role: Role
  ) => void;
  onBack: () => void;
  initialCode?: string;
};

export default function JoinRoom({ onRoomJoined, onBack, initialCode }: JoinRoomProps) {
  const [role, setRole] = useState<"player" | "spectator">("player");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (role === "player" && playerName.trim().length === 0) {
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
      if (role === "spectator") {
        const { data: room } = await supabase
          .from("rooms")
          .select("id, room_code")
          .eq("room_code", roomCode.trim().toUpperCase())
          .maybeSingle();
        if (!room) throw new Error("Room not found. Check the code and try again.");
        onRoomJoined(room.id, room.room_code, "", "", "spectator");
      } else {
        const { room, player } = await joinRoom(roomCode.trim(), playerName.trim());
        onRoomJoined(room.id, room.room_code, player.id, player.player_name, "player");
      }
    } catch (err: any) {
      const msg: string = err.message || "Something went wrong joining the room.";
      if (msg.includes("already started") || msg.includes("not found")) {
        const { data: exists } = await supabase
          .from("rooms")
          .select("id")
          .eq("room_code", roomCode.trim().toUpperCase())
          .maybeSingle();
        setError(
          exists
            ? "That game has already started. You can join as a spectator instead."
            : "Room not found. Check the code and try again."
        );
      } else if (msg.includes("full")) {
        setError("That room is full. You can join as a spectator instead.");
      } else {
        setError(msg);
      }
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
        placeholder={role === "spectator" ? "No name needed to spectate" : "Your name"}
        disabled={role === "spectator"}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "16px",
          fontSize: "1rem",
          opacity: role === "spectator" ? 0.5 : 1,
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

      <div
        style={{
          position: "relative",
          display: "flex",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "999px",
          padding: "4px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "4px",
            bottom: "4px",
            left: "4px",
            width: "calc(50% - 4px)",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            transform: role === "player" ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.2s ease",
          }}
        />
        {(["player", "spectator"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setRole(value)}
            style={{
              position: "relative",
              flex: 1,
              padding: "12px",
              background: "transparent",
              border: "none",
              fontWeight: "bold",
              fontSize: "1.05rem",
              cursor: "pointer",
              color: role === value ? "#000000" : "#fff2cc",
              textShadow: "none",
            }}
          >
            {value === "player" ? "Player" : "Spectator"}
          </button>
        ))}
      </div>

      <p style={{ fontSize: "1rem", marginBottom: "20px", minHeight: "1.5em" }}>
        {role === "spectator" ? "Watch the game without playing." : ""}
      </p>

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
        {loading ? "Joining..." : role === "spectator" ? "Watch The Game" : "Join The Host"}
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