import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }, next) => {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/dashboard")) {
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(request.headers.get("Cookie") ?? "");
          },
          setAll() {
            // No-op in middleware — response headers set by pages
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const next = encodeURIComponent(url.pathname);
      return redirect(`/login?next=${next}`);
    }
  }

  return next();
});
