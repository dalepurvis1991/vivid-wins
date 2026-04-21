// GET /auth/callback — handles Supabase email-confirmation redirects.
// Exchanges the `code` from the query string for a session cookie, then
// bounces into /competitions. Harmless in dev (email confirmation off)
// because Supabase won't call this endpoint.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(`${origin}/competitions`);
}
