// Footer — logo, partner strip, legal bits.
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="mt-24 border-t border-white/10 bg-vw-bg/80">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                    <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/vivid-wins-logo.png"
                            alt="Vivid Wins"
                            className="h-12 w-auto"
                        />
                        <p className="mt-4 max-w-sm text-sm text-vw-muted">
                            UK's fastest-growing Pokémon prize draws. Instant
                            wins + live Whatnot main draws. 48h dispatch on
                            every win.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-vw-muted">
                            Explore
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li>
                                <Link
                                    href="/competitions"
                                    className="hover:text-vw-accent-soft"
                                >
                                    Competitions
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/#how-it-works"
                                    className="hover:text-vw-accent-soft"
                                >
                                    How it works
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/account"
                                    className="hover:text-vw-accent-soft"
                                >
                                    Your account
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-vw-muted">
                            Partners
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li>
                                <Link
                                    href="https://www.whatnot.com/en-GB/user/jmiread"
                                    target="_blank"
                                    rel="noopener"
                                    className="hover:text-vw-accent-soft"
                                >
                                    @JMIRead on Whatnot
                                </Link>
                            </li>
                            <li>Dufflebagboyz</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-vw-muted">
                            Legal
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm text-vw-muted">
                            <li>Skill-based UK prize competition</li>
                            <li>18+ · Free postal entry available</li>
                            <li>Please gamble responsibly</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-vw-muted">
                    © {new Date().getFullYear()} Vivid Wins · UK's #1 Pokémon
                    Competition
                </div>
            </div>
        </footer>
    );
}
