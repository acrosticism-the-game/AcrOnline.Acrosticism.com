import React from "react";
import Header from "./Header";

type OnlineLandingProps = {
  onSelectCreate: () => void;
  onSelectJoin: () => void;
  onBackToHome: () => void;
};

export default function OnlineLanding({ onSelectCreate, onSelectJoin, onBackToHome }: OnlineLandingProps) {
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
      <h1
        style={{
          fontWeight: 700,
          fontSize: "50px",
          marginBottom: "40px",
        }}
      >
        Play Acrosticism Online
      </h1>

      <button
        onClick={onSelectCreate}
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
        Be The Host
      </button>

<button
        onClick={onSelectJoin}
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
        Join The Host
      </button>

      <button
        onClick={onBackToHome}
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
        Go Back
      </button>
    </div>
  );
}