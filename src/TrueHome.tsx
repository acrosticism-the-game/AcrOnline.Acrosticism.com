import React from "react";

type TrueHomeProps = {
  onSelectPassAndPlay: () => void;
  onSelectOnline: () => void;
};

export default function TrueHome({ onSelectPassAndPlay, onSelectOnline }: TrueHomeProps) {
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
      <h1
        style={{
          fontWeight: 700,
          fontSize: "50px",
          marginBottom: "40px",
        }}
      >
        Play Acrosticism Now
      </h1>

      <button
        onClick={onSelectPassAndPlay}
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
        Pass-and-Play
      </button>

      <button
        onClick={onSelectOnline}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: "pointer",
          border: "none",
        }}
      >
        Online Play
      </button>

      <a
        href="https://shop.acrosticism.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none" }}
      >
<button
          style={{
            display: "block",
            width: "100%",
            padding: "16px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #ff7ee5, #7afcff)",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: "pointer",
            border: "none",
          }}
        >
          Buy Now
        </button>
      </a>
    </div>
  );
}
