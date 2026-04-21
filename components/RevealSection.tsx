"use client";

// Client wrapper around TicketReveal that owns the confetti firing state.
// Each instant-win reveal bumps a counter which retriggers ConfettiBurst.

import { useState } from "react";
import TicketReveal, { type RevealEntry } from "./TicketReveal";
import ConfettiBurst from "./ConfettiBurst";

export default function RevealSection({
    entries,
}: {
    entries: RevealEntry[];
}) {
    const [burstKey, setBurstKey] = useState(0);
    return (
        <>
            <ConfettiBurst key={burstKey} fire={burstKey > 0} />
            <TicketReveal
                entries={entries}
                onInstantWin={() => setBurstKey((k) => k + 1)}
            />
        </>
    );
}
