// Server-side Supabase client — uses anon key + user's session cookie.
// Respects Row Level Security; queries run as the logged-in user.
// Use this in Server Components, Server Actions, and Route Handlers.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export function createClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: CookieToSet[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Server Components can't set cookies; silently ignore.
                        // The middleware will refresh the session on the next request.
                    }
                },
            },
        },
    );
}
