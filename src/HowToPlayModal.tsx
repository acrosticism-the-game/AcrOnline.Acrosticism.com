import React, { useEffect } from "react";

type HowToPlayModalProps = {
  onClose: () => void;
};

const pinkToBlue = "linear-gradient(90deg, #ff7ee5, #7afcff)";

const stepStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "14px",
  textAlign: "left",
};

const numberStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: pinkToBlue,
  color: "#000000",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.95rem",
};

const steps: { title: string; body: string }[] = [
  {
    title: "Flip the Theme Card",
    body: "The randomly selected judge reveals a Theme Card, like \"travel agency tagline\".",
  },
  {
    title: "Everyone else gets a Word Card",
    body: "You receive a random Word Card, like \"JIG\".",
  },
  {
    title: "Acrosticize!",
    body: "Everyone except the judge has 2 minutes to turn their word into a backronym that fits the theme. Each letter of the Word Card starts a line in your backronym.",
  },
  {
    title: "Judge picks a favorite",
    body: "The judge chooses the best one and that player scores a point. Ties are celebrated, not disputed.",
  },
  {
    title: "Rotate the judge",
    body: "The judge role passes randomly to the next player. Play continues until everyone has judged once.",
  },
];

export default function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  // Close on Escape, and stop the page behind from scrolling while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxSizing: "border-box",
          padding: "24px 20px",
          borderRadius: "12px",
          background: "#0b1540",
          border: "2px solid #7afcff",
          color: "#fff2cc",
          textShadow: "none",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "#fff2cc",
            fontSize: "1.6rem",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h2
          id="how-to-play-title"
          style={{ margin: "0 0 6px", fontSize: "1.6rem", textAlign: "center" }}
        >
          How to Play
        </h2>
        <p style={{ margin: "0 0 20px", textAlign: "center", fontSize: "0.9rem" }}>
          3 to 7 players. Turn words into backronyms.
        </p>

        {steps.map((step, i) => (
          <div key={step.title} style={stepStyle}>
            <div style={numberStyle}>{i + 1}</div>
            <div>
              <strong>{step.title}</strong>
              <div style={{ fontSize: "0.95rem", marginTop: "2px" }}>{step.body}</div>
            </div>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            display: "block",
            width: "100%",
            marginTop: "20px",
            padding: "14px",
            borderRadius: "8px",
            border: "none",
            background: pinkToBlue,
            color: "#000000",
            fontWeight: "bold",
            fontSize: "1.05rem",
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
          }}
        >
          Got it, let's play!
        </button>

        <a
          href="https://www.acrosticism.com/the-game/how-to-play"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: "14px",
            textAlign: "center",
            color: "#7afcff",
            fontSize: "0.9rem",
          }}
        >
          Read the full rules on Acrosticism.com
        </a>
      </div>
    </div>
  );
}
