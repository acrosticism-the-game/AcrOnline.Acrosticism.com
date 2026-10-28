import React, { useState } from "react";
import Header from "./Header";
import { createRoom, filterRoomCodeWords } from "./roomUtils";
import { containsProfanity } from "./profanity";
import { Role } from "./session";

type CreateRoomProps = {
  words: string[];
  onRoomCreated: (
    roomId: string,
    roomCode: string,
    playerId: string,
    playerName: string,
    role: Role,
    hostToken: string,
    playerToken: string
  ) => void;
  onBack: () => void;
};

export default function CreateRoom({ words, onRoomCreated, onBack }: CreateRoomProps) {
  const [hostRole, setHostRole] = useState<"player" | "spectator">("player");
  const [hostName, setHostName] = useState("");
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(true);
  const [wordFilter, setWordFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const asSpectator = hostRole === "spectator";

    if (words.length === 0) {
      setError("Still loading the word list. Give it a few seconds and try again.");
      return;
    }

    if (!asSpectator && hostName.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }

    if (!asSpectator && wordFilter && containsProfanity(hostName)) {
      setError("That name isn't allowed with the word filter on. Please pick a different one.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const candidateWords = filterRoomCodeWords(words);
      if (candidateWords.length === 0) {
        throw new Error("The word list did not load. Refresh the page and try again.");
      }
      const { room, player, hostToken, playerToken } = await createRoom(
        hostName.trim(),
        anonymousSubmissions,
        candidateWords,
        asSpectator,
        wordFilter
      );

      if (asSpectator || !player) {
        onRoomCreated(room.id, room.room_code, "", "", "host-spectator", hostToken, "");
      } else {
        onRoomCreated(room.id, room.room_code, player.id, player.player_name, "player", hostToken, playerToken);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong creating the room.");
    } finally {
      setLoading(false);
    }
  };

  const renderSwitch = (
    label: string,
    hint: string,
    checked: boolean,
    onChange: (value: boolean) => void
  ) => (
    <div style={{ marginBottom: "16px", textAlign: "left" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", fontSize: "1.05rem" }}>{label}</div>
          <div style={{ fontSize: "0.9rem", opacity: 0.85 }}>{hint}</div>
        </div>
        <button
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          style={{
            position: "relative",
            width: "56px",
            height: "30px",
            flexShrink: 0,
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: checked
              ? "linear-gradient(90deg, #ff7ee5, #7afcff)"
              : "rgba(255,255,255,0.25)",
            transition: "background 0.2s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: checked ? "29px" : "3px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#ffffff",
              transition: "left 0.2s ease",
            }}
          />
        </button>
      </div>
    </div>
  );

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
            transform: hostRole === "player" ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.2s ease",
          }}
        />
        {(["player", "spectator"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setHostRole(value)}
            style={{
              position: "relative",
              flex: 1,
              padding: "12px",
              background: "transparent",
              border: "none",
              fontWeight: "bold",
              fontSize: "1.05rem",
              cursor: "pointer",
              color: hostRole === value ? "#000000" : "#fff2cc",
              textShadow: "none",
            }}
          >
            {value === "player" ? "Host as Player" : "Host as Spectator"}
          </button>
        ))}
      </div>

      {hostRole === "spectator" ? (
        <p style={{ fontSize: "1rem", marginBottom: "20px" }}>
          Show the game on a big screen without playing. Great for a projector.
        </p>
      ) : (
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
            marginTop: "8px",
            marginBottom: "20px",
            fontSize: "1rem",
          }}
        />
      )}

      <div style={{ marginBottom: "8px" }}>
        {renderSwitch(
          "Anonymous Submissions",
          "Hide who wrote each backronym while the judge decides.",
          anonymousSubmissions,
          setAnonymousSubmissions
        )}
        {renderSwitch(
          "Word Filter",
          "Block inappropriate words in names and backronyms. Good for public games.",
          wordFilter,
          setWordFilter
        )}
      </div>

      {error && (
        <div style={{ color: "#ff4444", marginBottom: "16px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || words.length === 0}
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