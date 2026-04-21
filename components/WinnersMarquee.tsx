// Infinite-scrolling winners strip. Static/demo data for now — can be wired
// to a real recent_winners view later.

const WINNERS = [
    { icon: "🏆", name: "James H.", prize: "PSA 10 Umbreon VMAX" },
    { icon: "🎉", name: "Sarah C.", prize: "Evolving Skies BB" },
    { icon: "🔥", name: "Liam T.", prize: "Pokémon Mystery Box" },
    { icon: "⚡", name: "Michael D.", prize: "Graded Charizard" },
    { icon: "🌟", name: "Emma W.", prize: "151 Ultra Premium Collection" },
    { icon: "💎", name: "Tom R.", prize: "Crown Zenith ETB ×2" },
];

export default function WinnersMarquee() {
    const row = [...WINNERS, ...WINNERS]; // duplicate for seamless loop
    return (
        <div className="vw-marquee-mask overflow-hidden border-y border-white/10 bg-black/40 py-3">
            <div
                className="vw-marquee-track flex gap-8 whitespace-nowrap text-sm"
                style={{ width: "max-content" }}
            >
                {row.map((w, i) => (
                    <span
                        key={i}
                        className="flex items-center gap-2 text-vw-muted"
                    >
                        <span className="text-base">{w.icon}</span>
                        <span className="font-semibold text-vw-text">
                            {w.name}
                        </span>
                        <span>won</span>
                        <span className="font-bold text-vw-accent-soft">
                            {w.prize}
                        </span>
                        <span className="text-vw-muted/50">·</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
