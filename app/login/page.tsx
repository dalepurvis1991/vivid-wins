// Email + password login. Minimum-viable UI — a real login page with
// password-reset, magic links, socials etc. can land later.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
        redirect("/login?error=missing");
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        redirect(
            `/login?error=${encodeURIComponent(error.message.slice(0, 200))}`,
        );
    }

    redirect("/competitions");
}

export default function LoginPage({
    searchParams,
}: {
    searchParams: { error?: string };
}) {
    return (
        <>
            <Header />
            <main className="mx-auto max-w-md px-6 py-16">
                <h1 className="text-3xl font-extrabold tracking-tight">
                    Sign in
                </h1>
                <p className="mt-2 text-sm text-vw-muted">
                    Welcome back. Enter the email and password you signed up
                    with.
                </p>

                {searchParams.error ? (
                    <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                        {searchParams.error === "missing"
                            ? "Email and password are required."
                            : searchParams.error}
                    </div>
                ) : null}

                <form
                    action={loginAction}
                    className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-vw-surface/60 p-6"
                >
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
                        <span className="text-sm text-vw-muted">Password</span>
                        <input
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className="mt-1 w-full rounded-lg border border-white/10 bg-vw-bg/80 px-3 py-2 text-sm outline-none transition focus:border-vw-accent-soft"
                        />
                    </label>
                    <button
                        type="submit"
                        className="w-full rounded-full bg-vw-accent py-2.5 font-semibold text-black transition hover:bg-vw-accent-soft"
                    >
                        Sign in
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-vw-muted">
                    No account?{" "}
                    <Link
                        href="/signup"
                        className="font-semibold text-vw-accent-soft"
                    >
                        Sign up free
                    </Link>
                </p>
            </main>
        </>
    );
}
