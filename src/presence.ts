import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Role } from "./session";

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
            const state = channel.presenceState() as Record<string, any[]>;
            let n = 0;
            Object.values(state).forEach((entries) => {
                entries.forEach((entry: any) => {
                    if (entry.role === "spectator") n += 1;
                });
            });
            setCount(n);
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