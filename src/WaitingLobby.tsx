import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Header from "./Header";
import { supabase } from "./supabaseClient";
import { leaveRoom } from "./roomUtils";
import { Role } from "./session";

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
  role: Role;
  spectatorCount: number;
  onStartMatch: () => void;
  onBack: () => void;
  onRemoved: () => void;
};

export default function WaitingLobby({
  roomId,
  roomCode,
  playerId,
  isHost,
  role,
  spectatorCount,
  onStartMatch,
  onBack,
  onRemoved,
}: WaitingLobbyProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const leavingRef = useRef(false);

  // Fetch current players, refresh every few seconds, and listen for changes
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
        setLoaded(true);
      }
    };

    fetchPlayers();
    const poll = setInterval(fetchPlayers, 4000);

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
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const canStart = players.length >= 3 && players.length <= 7;

  // If the host removed this player, send them back home
  useEffect(() => {
    if (
      loaded &&
      !leavingRef.current &&
      role === "player" &&
      !isHost &&
      !players.some((p) => p.id === playerId)
    ) {
      onRemoved();
    }
  }, [loaded, players, role, isHost, playerId, onRemoved]);

  const isProjector = role === "host-spectator";
  const joinLink = `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`;
  const spectatorLine =
    spectatorCount === 1
      ? "1 spectator is watching the game."
      : `${spectatorCount} spectators are watching the game.`;

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: isProjector ? "900px" : "600px",
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
        Waiting Lobby
      </h1>

      {isProjector ? (
        <div style={{ marginBottom: "30px" }}>
          <div style={{ fontSize: "1.3rem", marginBottom: "8px" }}>Room Code</div>
          <div
            style={{
              fontSize: "5rem",
              fontWeight: 800,
              letterSpacing: "0.15em",
              marginBottom: "20px",
            }}
          >
            {roomCode}
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#ffffff",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            <QRCodeSVG value={joinLink} size={220} />
          </div>
          <div style={{ fontSize: "1.1rem" }}>
            Scan to join, or visit {window.location.host} and enter the code.
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "1.3rem", marginBottom: "30px" }}>
          Room Code: <strong>{roomCode}</strong>
        </div>
      )}

      <h2 style={{ marginBottom: "10px" }}>Players ({players.length}/7)</h2>

      <div style={{ marginBottom: "20px" }}>
        {players.map((p) => (
          <div
            key={p.id}
            style={{ fontSize: isProjector ? "1.6rem" : "1.1rem", marginBottom: "6px" }}
          >
            {p.player_name} {p.id === playerId ? "(you)" : ""}
            {isHost && p.id !== playerId && (
              <button
                onClick={async () => {
                  try {
                    await leaveRoom(p.id);
                    setPlayers((prev) => prev.filter((x) => x.id !== p.id));
                  } catch (err: any) {
                    setError(err.message || "Could not remove that player.");
                  }
                }}
                title="Remove player"
                style={{
                  marginLeft: "10px",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "#ff4444",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: "none",
                  textShadow: "none",
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {spectatorCount > 0 && (
        <div style={{ marginBottom: "20px", fontSize: "1.1rem" }}>{spectatorLine}</div>
      )}

      {error && (
        <div style={{ color: "#ff4444", marginBottom: "16px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      {!canStart && (
        <div style={{ marginBottom: "16px", fontSize: "1rem" }}>
          Need 3 to 7 players to start. Currently {players.length}.
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

      <button
        onClick={() => {
          leavingRef.current = true;
          onBack();
        }}
        style={{
          display: "block",
          margin: "24px auto 0",
          padding: "12px 24px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: "pointer",
          border: "none",
        }}
      >
        {isHost ? "Back" : "Leave"}
      </button>
    </div>
  );
}