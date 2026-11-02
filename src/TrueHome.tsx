import React, { useState } from "react";
import Header from "./Header";

type TrueHomeProps = {
  onSelectPassAndPlay: () => void;
  onSelectOnline: () => void;
};

const pinkToBlue = "linear-gradient(90deg, #ff7ee5, #7afcff)";
const blueToPink = "linear-gradient(90deg, #7afcff, #ff7ee5)";

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "16px",
  marginBottom: "16px",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "1.1rem",
  cursor: "pointer",
  border: "none",
  color: "#000000",
  textShadow: "none",
  textAlign: "center",
  textDecoration: "none",
  fontFamily: "Nunito, sans-serif",
};

const subtitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: "normal",
  marginTop: "4px",
};

const headingStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "clamp(32px, 9vw, 50px)",
  marginBottom: "40px",
};

export default function TrueHome({ onSelectPassAndPlay, onSelectOnline }: TrueHomeProps) {
  const [choosingMode, setChoosingMode] = useState(false);

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

      {choosingMode ? (
        <>
          <h1 style={headingStyle}>How Do You Want To Play?</h1>

          <button
            onClick={onSelectOnline}
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Play Together Online
            <span style={subtitleStyle}>Everyone on their own phone</span>
          </button>

          <button
            onClick={onSelectPassAndPlay}
            style={{ ...buttonStyle, background: blueToPink }}
          >
            Pass and Play
            <span style={subtitleStyle}>One device, passed around</span>
          </button>

          <button
            onClick={() => setChoosingMode(false)}
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Back
          </button>
        </>
      ) : (
        <>
          <h1 style={headingStyle}>Ready to Acrosticize?</h1>

          <button
            onClick={() => setChoosingMode(true)}
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Play Now
          </button>

          <a
            href="https://www.acrosticism.com/the-game/how-to-play"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, background: blueToPink }}
          >
            How to Play
          </a>

          <a
            href="https://www.acrosticism.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Acrosticism.com
          </a>
        </>
      )}
    </div>
  );
}