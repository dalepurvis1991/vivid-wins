// Email + password signup. On success we also seed the two companion rows
// that aren't created automatically by Supabase auth — users_metadata (for
// profile fields added later) and wallets (zero balance). Using the admin
// client here is safe: the new user_id comes from the auth response we just
// got, not from user input.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

async function signupAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const firstName = String(formData.get("first_name") ?? "").trim();

    if (!email || !password) {
        redirect("/signup?error=missing");
    }
    if (password.length < 8) {
        redirect("/signup?error=Password must be at least 8 characters.");
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // With Supabase email confirmation OFF in dev, the session is
            // returned immediately and the user is logged in.
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
            data: { first_name: firstName || null },
        },
    });

    if (error) {
        redirect(
            `/signup?error=${encodeURIComponent(error.message.slice(0, 200))}`,
        );
    }

    const userId = data.user?.id;
    if (userId) {
        const admin = createAdminClient();
        // Best-effort insert — if the row already exists (re-signup / confirm
        // link retry), upsert keeps things idempotent.
        await admin.from("users_metadata").upsert(
            {
                user_id: userId,
                first_name: firstName || null,
            },
            { onConflict: "user_id" },
        );
        await admin.from("wallets").upsert(
            { user_id: userId, balance_pennies: 0 },
            { onConflict: "user_id" },
        );
    }

    // If email confirmation is ON, data.session is null — send them to a
    // "check your email" page. For dev (confirmation off) they're already
    // logged in and we drop them on /competitions.
    if (!data.session) {
        redirect("/signup?pending=1");
    }
    redirect("/competitions");
}

export default function SignupPage({
    searchParams,
}: {
    searchParams: { error?: string; pending?: string };
}) {
    return (
        <>
            <Header />
            <main className="mx-auto max-w-md px-6 py-16">
                <h1 className="text-3xl font-extrabold tracking-tight">
                    Create your account
                </h1>
                <p className="mt-2 text-sm text-vw-muted">
                    Free — takes under a minute. You'll get a wallet
                    automatically for instant credit wins.
                </p>

                {searchParams.error ? (
                    <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                        {searchParams.error === "missing"
                            ? "Email and password are required."
                            : searchParams.error}
                    </div>
                ) : null}
                {searchParams.pending ? (
                    <div className="mt-6 rounded-lg border border-vw-accent-soft/40 bg-vw-accent-soft/10 p-3 text-sm">
                        Check your email for a confirmation link, then sign in.
                    </div>
                ) : null}

                <form
                    action={signupAction}
                    className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-vw-surface/60 p-6"
                >
                    <label className="block">
                        <span className="text-sm text-vw-muted">
                            First name (optional)
                        </span>
                        <input
                            name="first_name"
                            type="text"
                            autoComplete="given-name"
                            className="mt-1 w-full rounded-lg border border-white/10 bg-vw-bg/80 px-3 py-2 text-sm outline-none transition focus:border-vw-accent-soft"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm text-vw-muted">Email</span>
                        <input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            className="mt-1 w-full rounded-lg border border-white/10 bg-vw-bg/80 px-3 py-2 text-sm outline-none transition focus:border-vw-accent-soft"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm text-vw-muted">
                            Password (min 8 chars)
                        </span>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className="mt-1 w-full rounded-lg border border-white/10 bg-vw-bg/80 px-3 py-2 text-sm outline-none transition focus:border-vw-accent-soft"
                        />
                    </label>
                    <button
                        type="submit"
                        className="w-full rounded-full bg-vw-accent py-2.5 font-semibold text-black transition hover:bg-vw-accent-soft"
                    >
                        Create account
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-vw-muted">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-vw-accent-soft"
                    >
                        Sign in
                    </Link>
                </p>
            </main>
        </>
    );
}
