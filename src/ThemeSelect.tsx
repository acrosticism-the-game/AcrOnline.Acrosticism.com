import React, { useState } from "react";
import Header from "./Header";

type ThemeSelectProps = {
  isJudge: boolean;
  themes: string[];
  onThemeChosen: (theme: string) => void;
};

export default function ThemeSelect({ isJudge, themes, onThemeChosen }: ThemeSelectProps) {
  const [themeMode, setThemeMode] = useState<"random" | "custom">("random");
  const [customTheme, setCustomTheme] = useState("");

  const handleConfirm = () => {
    if (themeMode === "random") {
      const randomTheme = themes[Math.floor(Math.random() * themes.length)] || "";
      onThemeChosen(randomTheme);
    } else {
      if (customTheme.trim().length === 0) return;
      onThemeChosen(customTheme.trim());
    }
  };
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
      <Header />
        <h2>Waiting for the Judge to choose a theme...</h2>
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
      <Header />
      <h1 style={{ fontWeight: 700, fontSize: "40px", marginBottom: "20px" }}>
        You're the Judge!
      </h1>
      <p style={{ marginBottom: "20px" }}>Choose a theme for this turn.</p>

      <div style={{ marginBottom: "8px" }}>
        <label>
          <input
            type="radio"
            value="random"
            checked={themeMode === "random"}
            onChange={() => setThemeMode("random")}
            style={{ marginRight: "8px" }}
          />
          Random Theme
        </label>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label>
          <input
          type="radio"
            value="custom"
            checked={themeMode === "custom"}
            onChange={() => setThemeMode("custom")}
            style={{ marginRight: "8px" }}
          />
          Custom Theme
        </label>
      </div>

      {themeMode === "custom" && (
        <input
          type="text"
          value={customTheme}
          onChange={(e) => setCustomTheme(e.target.value)}
          placeholder="Enter custom theme..."
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginBottom: "20px",
          }}
        />
      )}

      <button
        onClick={handleConfirm}
        disabled={themeMode === "custom" && customTheme.trim().length === 0}
        style={{
          padding: "12px 24px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: "pointer",
          border: "none",
        }}
      >
        Confirm Theme
      </button>
    </div>
  );
}