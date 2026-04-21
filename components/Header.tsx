// Header — logo on the left, nav centre, account / sign-in + live CTA right.
// Server component; reads auth state from cookies.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-vw-bg/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
                <Link href="/" aria-label="Vivid Wins home" className="flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/vivid-wins-logo.png"
                        alt="Vivid Wins"
                        className="h-10 w-auto"
                    />
                </Link>

                <nav className="hidden items-center gap-6 text-sm md:flex">
                    <Link
                        href="/competitions"
                        className="text-vw-muted transition hover:text-vw-text"
                    >
                        Competitions
                    </Link>
                    <Link
                        href="/#how-it-works"
                        className="text-vw-muted transition hover:text-vw-text"
                    >
                        How it works
                    </Link>
                    {user ? (
                        <Link
                            href="/account/wallet"
                            className="text-vw-muted transition hover:text-vw-text"
                        >
                            Wallet
                        </Link>
                    ) : null}
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        href="https://www.whatnot.com/en-GB/user/jmiread"
                        target="_blank"
                        rel="noopener"
                        className="hidden items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 sm:flex"
                    >
                        <span className="vw-live-dot inline-block h-2 w-2 rounded-full bg-red-500" />
                        LIVE
                    </Link>

                    {user ? (
                        <>
                            <Link
                                href="/account"
                                className="rounded-full border border-white/15 bg-vw-surface/70 px-4 py-1.5 text-sm font-semibold transition hover:border-vw-accent-soft/60"
                            >
                                {user.email?.split("@")[0] ?? "Account"}
                            </Link>
                            <form action="/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="text-xs text-vw-muted transition hover:text-vw-text"
                                    aria-label="Sign out"
                                >
                                    Sign out
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden text-sm text-vw-muted transition hover:text-vw-text sm:inline"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/signup"
                                className="rounded-full bg-vw-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-vw-accent-soft"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
