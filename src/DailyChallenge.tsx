import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import { getLiveStreak, readStreak, recordDailyPlay } from "./dailyStreak";
import {
  DAILY_THEMES_CACHE_KEY,
  DAILY_THEMES_CSV,
  DAILY_WORDS_CACHE_KEY,
  DAILY_WORDS_CSV,
  loadDailyList,
} from "./dailyLists";
import { containsProfanity } from "./profanity";
import {
  buildShareText,
  getDailyDateString,
  getDailyNumber,
  getDailyTheme,
  getDailyWord,
} from "./dailyUtils";
import {
  buildShareCaption,
  canShareImageFiles,
  cardFileName,
  downloadBlob,
  renderShareCard,
} from "./shareCard";

const TIMER_SECONDS = 120;
const STORAGE_PREFIX = "acr_daily_";

type DailyRecord = {
  word: string;
  theme: string;
  startedAt: number;
  lines: string[];
  submitted: boolean;
  filtered?: boolean;
};

type DailyChallengeProps = {
  onBack: () => void;
};

const pinkToBlue = "linear-gradient(90deg, #ff7ee5, #7afcff)";
const blueToPink = "linear-gradient(90deg, #7afcff, #ff7ee5)";

const pageStyle: React.CSSProperties = {
  padding: "20px",
  maxWidth: "600px",
  margin: "0 auto",
  textAlign: "center",
  fontFamily: "Nunito, sans-serif",
  color: "#fff2cc",
  textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
  minHeight: "100vh",
};

const headingStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "clamp(32px, 9vw, 50px)",
  marginBottom: "24px",
};

const bigButtonStyle: React.CSSProperties = {
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
  fontFamily: "Nunito, sans-serif",
};

const subtitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: "normal",
  marginTop: "4px",
};

const themeBannerStyle: React.CSSProperties = {
  marginBottom: "20px",
  fontSize: "1.2rem",
  padding: "10px",
  borderRadius: "8px",
  background: blueToPink,
  fontWeight: "bold",
  color: "#000000",
  textAlign: "center",
  textShadow: "none",
};

const readRecord = (key: string): DailyRecord | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.word === "string" &&
      typeof parsed.theme === "string" &&
      typeof parsed.startedAt === "number" &&
      Array.isArray(parsed.lines) &&
      typeof parsed.submitted === "boolean"
    ) {
      return parsed as DailyRecord;
    }
    return null;
  } catch {
    return null;
  }
};

const enforceFirstLetter = (targetLetter: string, text: string) => {
  if (!text) return targetLetter.toUpperCase();
  return targetLetter.toUpperCase() + text.slice(1);
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// "2026-11-09" -> "Monday, November 9"
const formatDateLabel = (dateString: string) => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export default function DailyChallenge({ onBack }: DailyChallengeProps) {
  const [today] = useState(() => getDailyDateString());
  const storageKey = `${STORAGE_PREFIX}${today}`;
  const number = getDailyNumber(today);

  const [record, setRecord] = useState<DailyRecord | null>(() => readRecord(storageKey));
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  // Load today's word and theme lists from the daily challenge sheet
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadDailyList(DAILY_WORDS_CSV, DAILY_WORDS_CACHE_KEY),
      loadDailyList(DAILY_THEMES_CSV, DAILY_THEMES_CACHE_KEY),
    ]).then(([loadedWords, loadedThemes]) => {
      if (cancelled) return;
      setWords(loadedWords);
      setThemes(loadedThemes);
      setListsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [copyStatus, setCopyStatus] = useState("");
  const [showTextBox, setShowTextBox] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState("");
  const [cardFailed, setCardFailed] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const [canShareImage] = useState(() => canShareImageFiles());

  // Day streak, kept on this device. Reopening a challenge already finished today counts it too.
  const [streak, setStreak] = useState(() =>
    record && record.submitted ? recordDailyPlay(today) : readStreak()
  );
  const streakCount = getLiveStreak(streak, today);
  const shareBoxRef = useRef<HTMLTextAreaElement>(null);

  // Save progress on this device so a refresh cannot reset the clock or lose lines
  useEffect(() => {
    if (!record) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(record));
    } catch { }
  }, [record, storageKey]);

  // If the app was left open past midnight Eastern, reload so it shows the new day
  useEffect(() => {
    const checkForNewDay = () => {
      if (document.visibilityState !== "visible") return;
      if (record && !record.submitted) return;
      if (getDailyDateString() !== today) window.location.reload();
    };
    document.addEventListener("visibilitychange", checkForNewDay);
    window.addEventListener("focus", checkForNewDay);
    return () => {
      document.removeEventListener("visibilitychange", checkForNewDay);
      window.removeEventListener("focus", checkForNewDay);
    };
  }, [today, record]);

  // Tick the clock while the player is writing
  const writing = !!record && !record.submitted;
  useEffect(() => {
    if (!writing) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [writing]);

  // Once the challenge is submitted, make the share image
  const submittedRecord = record && record.submitted ? record : null;
  useEffect(() => {
    if (!submittedRecord) return;
    let cancelled = false;
    let url = "";
    renderShareCard({
      number,
      theme: submittedRecord.theme,
      word: submittedRecord.word,
      lines: submittedRecord.lines,
      streak: streakCount,
    })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setCardBlob(blob);
        setCardUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCardFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [submittedRecord, number, streakCount]);

  const secondsLeft = record
    ? Math.max(
      0,
      Math.min(TIMER_SECONDS, TIMER_SECONDS - Math.floor((now - record.startedAt) / 1000))
    )
    : TIMER_SECONDS;
  const timeIsUp = secondsLeft === 0;

  const listsReady = words.length > 0 && themes.length > 0;

  const startChallenge = () => {
    if (!listsReady) return;
    // The word and theme are picked now and then locked in for the day
    const word = getDailyWord(words, today);
    const theme = getDailyTheme(themes, today);
    if (!word) return;
    const startedAt = Date.now();
    setNow(startedAt);
    setRecord({ word, theme, startedAt, lines: [], submitted: false });
  };

  const updateLine = (index: number, value: string) => {
    setRecord((prev) => {
      if (!prev || prev.submitted) return prev;
      if (Date.now() - prev.startedAt >= TIMER_SECONDS * 1000) return prev;
      const lines = prev.word.split("").map((_, i) => prev.lines[i] || "");
      lines[index] = enforceFirstLetter(prev.word[index] || "", value);
      return { ...prev, lines };
    });
  };

  const submit = () => {
    if (!record || record.submitted) return;
    const timedOut = Date.now() - record.startedAt >= TIMER_SECONDS * 1000;
    let lines = record.word.split("").map((_, i) => record.lines[i] || "");

    const flagged = lines.map((line) => containsProfanity(line));
    const anyFlagged = flagged.some(Boolean);
    if (anyFlagged && !timedOut) {
      setMessage("A line tripped the word filter. Please reword it and submit again.");
      return;
    }
    if (anyFlagged) {
      // Time is up, so flagged lines are simply left out
      lines = lines.map((line, i) => (flagged[i] ? "" : line));
    }

    // A line that is only the auto-filled first letter counts as blank
    lines = lines.map((line) => (line.trim().length <= 1 ? "" : line.trim()));

    setMessage("");
    setStreak(recordDailyPlay(today));
    setRecord({ ...record, lines, submitted: true, filtered: anyFlagged });
  };

  const hasAnyLine = !!record && record.lines.some((line) => (line || "").trim().length > 1);

  const shareText = record
    ? buildShareText({
      number,
      theme: record.theme,
      word: record.word,
      lines: record.lines,
      streak: streakCount,
    })
    : "";

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyStatus("Copied! Now paste it anywhere you like.");
    } catch {
      setShowTextBox(true);
      setCopyStatus("Could not copy automatically. Select the text below and copy it manually.");
    }
  };

  // On phones this opens the share sheet with the image. Elsewhere it saves the image.
  const shareImage = async () => {
    if (!cardBlob) return;
    const fileName = cardFileName(number);
    if (canShareImage) {
      try {
        const file = new File([cardBlob], fileName, { type: "image/png" });
        await navigator.share({ files: [file], text: buildShareCaption(number) });
        return;
      } catch (error) {
        // The player closed the share sheet, so there is nothing more to do
        if ((error instanceof DOMException) && (error.name === "AbortError")) return;
      }
    }
    downloadBlob(cardBlob, fileName);
    setImageStatus("Image saved. Attach it to your post!");
  };

  // Shares the image and the full words together. If this device cannot share a file,
  // the image is saved and the words are copied so they can be pasted with it.
  const shareImageAndWords = async () => {
    if (!cardBlob) return;
    const fileName = cardFileName(number);
    if (canShareImage) {
      try {
        const file = new File([cardBlob], fileName, { type: "image/png" });
        await navigator.share({ files: [file], text: shareText });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    downloadBlob(cardBlob, fileName);
    try {
      await navigator.clipboard.writeText(shareText);
      setImageStatus("Image saved and words copied. Attach the image and paste the words into your post!");
    } catch {
      setImageStatus("Image saved. Use the Copy button below to get the words.");
    }
  };

  // Screen 1: ready
  if (!record) {
    return (
      <div style={pageStyle}>
        <Header />
        <h1 style={headingStyle}>Get Ready!</h1>
        <p style={{ fontSize: "1.2rem", marginBottom: "4px" }}>
          {`Daily Challenge No. ${number}`}
        </p>
        <p style={{ fontSize: "1.1rem", marginBottom: "24px" }}>{formatDateLabel(today)}</p>
        {streakCount > 0 && (
          <p style={{ fontSize: "1.1rem", marginBottom: "12px" }}>
            {`Day streak: ${streakCount}. Play today to keep it going!`}
          </p>
        )}
        <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
          The theme is hidden until you are ready to acrosticize.
        </p>
        <p style={{ fontSize: "1rem", marginBottom: "28px" }}>
          Click the button below. You will have 2 minutes to write your backronym.
        </p>

        <button
          onClick={startChallenge}
          disabled={!listsReady}
          style={{
            ...bigButtonStyle,
            background: pinkToBlue,
            opacity: listsReady ? 1 : 0.5,
            cursor: listsReady ? "pointer" : "not-allowed",
          }}
        >
          {listsReady
            ? "Acrosticize THIS!"
            : listsLoaded
            ? "Could not load. Check your connection and refresh."
            : "Loading..."}
        </button>

        <button onClick={onBack} style={{ ...bigButtonStyle, background: blueToPink }}>
          Back
        </button>
      </div>
    );
  }

  // Screen 2: writing
  if (!record.submitted) {
    const timerColor = secondsLeft <= 30 ? "#ff4444" : secondsLeft <= 60 ? "#ffaa00" : "#44cc44";

    return (
      <div style={pageStyle}>
        <Header />
        <h2>{`Daily Challenge No. ${number}`}</h2>

        <div
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: timerColor,
            marginBottom: "16px",
          }}
        >
          {formatTime(secondsLeft)}
        </div>

        {timeIsUp && (
          <div
            style={{
              color: "#ff4444",
              fontWeight: "bold",
              marginBottom: "12px",
              fontSize: "1.2rem",
            }}
          >
            Time is up! Submit your backronym.
          </div>
        )}

        <div style={themeBannerStyle}>{record.theme}</div>

        {record.word.split("").map((letter, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "1.2rem",
                color: "#000000",
                background: "linear-gradient(135deg, #ff7ee5, #7afcff)",
                borderRadius: "6px",
                marginRight: "10px",
                flexShrink: 0,
                textShadow: "none",
              }}
            >
              {letter.toUpperCase()}
            </div>

            <input
              type="text"
              value={record.lines[i] || ""}
              onChange={(e) => updateLine(i, e.target.value)}
              disabled={timeIsUp}
              maxLength={100}
              placeholder="Type your line..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px",
                fontSize: "1rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
                textShadow: "none",
              }}
            />
          </div>
        ))}

        {message && (
          <div style={{ color: "#ff9999", fontWeight: "bold", marginTop: "12px" }}>{message}</div>
        )}

        <button
          onClick={submit}
          disabled={!hasAnyLine}
          style={{
            ...bigButtonStyle,
            marginTop: "20px",
            background: pinkToBlue,
            opacity: hasAnyLine ? 1 : 0.5,
            cursor: hasAnyLine ? "pointer" : "not-allowed",
          }}
        >
          Submit Backronym
        </button>
      </div>
    );
  }

    // Screen 3: done and share
  return (
    <div style={pageStyle}>
      <Header />
      <h1 style={headingStyle}>Nice work!</h1>
      <p style={{ fontSize: "1.1rem", marginBottom: "20px" }}>
        Share your backronym with your friends. Come back tomorrow for a new challenge.
      </p>

      {streakCount > 0 && (
        <p style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "20px" }}>
          {`Day streak: ${streakCount}`}
          {streak.best > streakCount ? ` (best: ${streak.best})` : ""}
        </p>
      )}

      {cardUrl ? (
        <img
          src={cardUrl}
          alt={`Your Acrosticize THIS! backronym for challenge No. ${number}`}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            borderRadius: "12px",
            marginBottom: "16px",
          }}
        />
      ) : (
        !cardFailed && <p style={{ marginBottom: "16px" }}>Making your share image...</p>
      )}

      {cardFailed && (
        <p style={{ marginBottom: "16px" }}>
          The share image could not be made, but you can still copy the text below.
        </p>
      )}

      <button onClick={copyShare} style={{ ...bigButtonStyle, background: blueToPink }}>
        Copy Your Backronym
        <span style={subtitleStyle}>Text Only</span>
      </button>

      {copyStatus && <p style={{ marginBottom: "16px" }}>{copyStatus}</p>}

      {(cardFailed || showTextBox) && (
        <textarea
          ref={shareBoxRef}
          readOnly
          value={shareText}
          rows={shareText.split("\n").length + 1}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "1rem",
            fontFamily: "Nunito, sans-serif",
            textAlign: "left",
            borderRadius: "8px",
            border: "1px solid #ccc",
            resize: "none",
            color: "#000000",
            background: "#ffffff",
            textShadow: "none",
          }}
        />
      )}

      {record.filtered && (
        <p style={{ fontSize: "0.95rem", marginBottom: "16px" }}>
          A line was left out by the word filter.
        </p>
      )}

      {!cardFailed && (
        <button
          onClick={shareImage}
          disabled={!cardBlob}
          style={{
            ...bigButtonStyle,
            background: pinkToBlue,
            opacity: cardBlob ? 1 : 0.5,
            cursor: cardBlob ? "pointer" : "not-allowed",
          }}
        >
          {canShareImage ? "Share Your Backronym" : "Save Image"}
          <span style={subtitleStyle}>Image and Tags</span>
        </button>
      )}

      {!cardFailed && (
        <button
          onClick={shareImageAndWords}
          disabled={!cardBlob}
          style={{
            ...bigButtonStyle,
            background: blueToPink,
            opacity: cardBlob ? 1 : 0.5,
            cursor: cardBlob ? "pointer" : "not-allowed",
          }}
        >
          {canShareImage ? "Share Everything" : "Save Image + Copy Words"}
          <span style={subtitleStyle}>Image, Text and Tags</span>
        </button>
      )}

      {imageStatus && <p style={{ marginBottom: "16px" }}>{imageStatus}</p>}

      <button onClick={onBack} style={{ ...bigButtonStyle, background: pinkToBlue }}>
        Back to Home
      </button>
    </div>
  );
}