import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Player = {
  id: string;
  player_name: string;
  score: number;
  has_judged: boolean;
};

type WaitingLobbyProps = {
  roomId: string;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  onStartMatch: () => void;
};

export default function WaitingLobby({ roomId, roomCode, playerId, isHost, onStartMatch }: WaitingLobbyProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");

  // Fetch current players, then subscribe to changes
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("room_players")
        .select("id, player_name, score, has_judged")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });

      if (error) {
        setError(error.message);
      } else if (data) {
        setPlayers(data);
      }
    };

    fetchPlayers();

    const channel = supabase
      .channel(`room-players-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const canStart = players.length >= 3 && players.length <= 7;
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
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "10px" }}>
        Waiting Lobby
      </h1>

      <div style={{ fontSize: "1.3rem", marginBottom: "30px" }}>
        Room Code: <strong>{roomCode}</strong>
      </div>

      <h2 style={{ marginBottom: "10px" }}>Players ({players.length}/7)</h2>

      <div style={{ marginBottom: "20px" }}>
        {players.map((p) => (
          <div key={p.id} style={{ fontSize: "1.1rem", marginBottom: "6px" }}>
            {p.player_name} {p.id === playerId ? "(you)" : ""}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: "#ff4444", marginBottom: "16px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      {!canStart && (
        <div style={{ marginBottom: "16px", fontSize: "1rem" }}>
          Need 3–7 players to start. Currently {players.length}.
        </div>
      )}

      {isHost ? (
        <button
          onClick={onStartMatch}
          disabled={!canStart}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: canStart ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          Start Round
        </button>
      ) : (
        <div style={{ fontSize: "1rem" }}>Waiting for host to start the game...</div>
      )}
    </div>
  );
}