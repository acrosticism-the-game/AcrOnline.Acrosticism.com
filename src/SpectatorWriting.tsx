import React, { useEffect, useState } from "react";
import Header from "./Header";
import { supabase } from "./supabaseClient";

const TIMER_SECONDS = 120;

type SpectatorWritingProps = {
  roundId: string;
  roomId: string;
  theme: string;
};

export default function SpectatorWriting({ roundId, roomId, theme }: SpectatorWritingProps) {
  const [submitted, setSubmitted] = useState(0);
  const [expected, setExpected] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  // Load the round, sync to the server clock, and listen for new submissions
  useEffect(() => {
    let cancelled = false;

    const channel = supabase
      .channel(`spectator-writing-${roundId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `id=eq.${roundId}` },
        (payload: any) => {
          if (payload.new && typeof payload.new.submitted_count === "number") {
            setSubmitted(payload.new.submitted_count);
          }
        }
      )
      .subscribe();

    const load = async () => {
      const { data: round } = await supabase
        .from("rounds")
        .select("writing_started_at, submitted_count")
        .eq("id", roundId)
        .maybeSingle();
      const { data: serverNow } = await supabase.rpc("server_now");
      const { count } = await supabase
        .from("room_players")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId);

      if (cancelled) return;

      const offset = serverNow ? new Date(serverNow).getTime() - Date.now() : 0;
      const startedAt = round?.writing_started_at
        ? new Date(round.writing_started_at).getTime()
        : Date.now() + offset;

      setSubmitted(round?.submitted_count ?? 0);
      setExpected(Math.max((count ?? 0) - 1, 0)); // everyone except the judge
      setDeadline(startedAt + TIMER_SECONDS * 1000 - offset);
    };

    load();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roundId, roomId]);

  // Countdown based on the server's start time
  useEffect(() => {
    if (deadline === null) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timeUp = deadline !== null && timeLeft === 0;
  const allIn = expected > 0 && submitted >= expected;
  const finished = timeUp || allIn;

  let headline = "Acrosticizing in progress...";
  if (timeUp) headline = "Time's up!";
  else if (allIn) headline = `${expected} of ${expected} submitted.`;
  else if (expected > 0) headline = `${submitted} of ${expected} submitted.`;

  const timerColor =
    timeLeft <= 30 ? "#ff4444" : timeLeft <= 60 ? "#ffaa00" : "#44cc44";

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "0 auto",
        textAlign: "center",
        fontFamily: "Nunito, sans-serif",
        color: "#fff2cc",
        textShadow: "0 0 20px #1155cc, 0 0 40px #1155cc",
        minHeight: "100vh",
      }}
    >
      <Header />

      <div
        style={{
          marginBottom: "30px",
          fontSize: "1.8rem",
          padding: "14px",
          borderRadius: "10px",
          background: "linear-gradient(90deg, #7afcff, #ff7ee5)",
          fontWeight: "bold",
          color: "#000000",
          textShadow: "none",
        }}
      >
        {theme}
      </div>

      {!finished && deadline !== null && (
        <div
          style={{
            fontSize: "5rem",
            fontWeight: "bold",
            color: timerColor,
            marginBottom: "20px",
          }}
        >
          {formatTime(timeLeft)}
        </div>
      )}

      <div style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "12px" }}>
        {headline}
      </div>

      {finished && (
        <div style={{ fontSize: "1.8rem" }}>
          Pencils down, it's judgment time.
        </div>
      )}
    </div>
  );
}