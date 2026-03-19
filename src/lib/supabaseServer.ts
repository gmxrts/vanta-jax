import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroGlobal } from "astro";

export function createSupabaseServerClient(Astro: AstroGlobal) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(Astro.request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            Astro.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );
}
