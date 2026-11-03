import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Role } from "./session";

export const SPECTATOR_CAP = 30;

const countSpectators = (state: Record<string, any[]>): number => {
  let n = 0;
  Object.values(state).forEach((entries) => {
    entries.forEach((entry: any) => {
      if (entry.role === "spectator") n += 1;
    });
  });
  return n;
};

// Counts spectators connected to a room right now. Spectators announce
// themselves; everyone else just listens. Closed tabs drop off by themselves.
export function useSpectatorCount(roomId: string, role: Role): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    const key = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key } },
    });

    channel.on("presence", { event: "sync" }, () => {
      setCount(countSpectators(channel.presenceState() as Record<string, any[]>));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && role !== "player") {
        await channel.track({ role });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, role]);

  return count;
}

// A quick look at how many spectators are in a room, used before joining.
// If the count can't be read within a few seconds, it returns 0 so that a
// slow connection never locks anyone out.
export function peekSpectatorCount(roomId: string): Promise<number> {
  return new Promise((resolve) => {
    const key = "peek-" + Math.random().toString(36).slice(2);
    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key } },
    });

    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (n: number) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
      resolve(n);
    };

    timer = setTimeout(() => finish(0), 3000);

    channel.on("presence", { event: "sync" }, () => {
      finish(countSpectators(channel.presenceState() as Record<string, any[]>));
    });

    channel.subscribe();
  });
}