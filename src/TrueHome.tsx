import React, { useEffect, useState } from "react";
import Header from "./Header";
import HowToPlayModal from "./HowToPlayModal";
import { DAILY_SHARE_URL, getLinkTarget, isStandalone } from "./dailyUtils";
import { canPromptInstall, isIosDevice, onInstallChange, promptInstall } from "./installPrompt";
type TrueHomeProps = {
  onSelectPassAndPlay: () => void;
  onSelectOnline: () => void;
  onSelectDaily: () => void;
};

const pinkToBlue = "linear-gradient(90deg, #ff7ee5, #7afcff)";
const blueToPink = "linear-gradient(90deg, #7afcff, #ff7ee5)";
const rainbow = "linear-gradient(90deg, #ff6b6b, #ffa94d, #ffe066, #69db7c, #4dabf7, #b197fc)";

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

// True when the app is shown inside another page, such as the Google Site embed.
const isEmbedded = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export default function TrueHome({ onSelectPassAndPlay, onSelectOnline, onSelectDaily }: TrueHomeProps) {
  const [choosingMode, setChoosingMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [embedded] = useState(() => isEmbedded());
  const [installable, setInstallable] = useState(() => canPromptInstall());
  const [installDismissed, setInstallDismissed] = useState(false);
  // The embed's Download The App button opens this page with ?install=1
  const wantsInstall =
    new URLSearchParams(window.location.search).get("install") === "1";

  useEffect(() => onInstallChange(() => setInstallable(canPromptInstall())), []);

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

      {showRules && <HowToPlayModal onClose={() => setShowRules(false)} />}

      {wantsInstall && !embedded && !isStandalone() && !installDismissed && (
        <div
          style={{
            margin: "0 0 24px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(0, 0, 0, 0.35)",
            border: "2px solid #7afcff",
            textShadow: "none",
          }}
        >
          <strong style={{ fontSize: "1.2rem" }}>Get the Acrosticism app</strong>
          {installable ? (
            <button
              onClick={async () => {
                const accepted = await promptInstall();
                if (accepted) setInstallDismissed(true);
              }}
              style={{ ...buttonStyle, background: pinkToBlue, marginTop: "12px", marginBottom: "0" }}
            >
              Install App
              <span style={subtitleStyle}>One tap, no app store</span>
            </button>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: "1rem" }}>
              {isIosDevice()
                ? "Tap the Share button in Safari, then choose Add to Home Screen."
                : "Open your browser menu and choose Install app or Add to Home Screen."}
            </p>
          )}
          <button
            onClick={() => setInstallDismissed(true)}
            style={{
              marginTop: "12px",
              background: "transparent",
              border: "none",
              color: "#fff2cc",
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontSize: "0.9rem",
            }}
          >
            Not now
          </button>
        </div>
      )}

      {choosingMode ? (
        <>
          <h1 style={headingStyle}>Choose your play mode.</h1>

          <button
            onClick={onSelectOnline}
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Online Mode
            <span style={subtitleStyle}>Everyone on their own device</span>
          </button>

          <button
            onClick={onSelectPassAndPlay}
            style={{ ...buttonStyle, background: blueToPink }}
          >
            Practice Mode
            <span style={subtitleStyle}>Everyone on this device</span>
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

          {embedded ? (
            <a
              href={`${DAILY_SHARE_URL}/?install=1`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...buttonStyle, background: blueToPink }}
            >
              Download The App
              <span style={subtitleStyle}>Play and share on your phone (opens a new tab)</span>
            </a>
          ) : (
            <button
              onClick={onSelectDaily}
              style={{ ...buttonStyle, background: rainbow }}
            >
              Acrosticize THIS!
              <span style={subtitleStyle}>Daily Word. Weekly Theme. Share The Chaos.</span>
            </button>
          )}

          <button
            onClick={() => setChoosingMode(true)}
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Play Now
            <span style={subtitleStyle}>Online or Practice Modes</span>
          </button>


          <button
            onClick={() => setShowRules(true)}
            style={{ ...buttonStyle, background: blueToPink }}
          >
            How to Play
            <span style={subtitleStyle}>Learn the rules</span>
          </button>

          <a
            href="https://www.acrosticism.com"
            target={getLinkTarget()}
            rel="noopener noreferrer"
            style={{ ...buttonStyle, background: pinkToBlue }}
          >
            Acrosticism.com
            <span style={subtitleStyle}>Visit the official website</span>
          </a>
        </>
      )}
    </div>
  );
}