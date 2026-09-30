// Patches global fetch (browser only) to attach the current Supabase access token
// as `Authorization: Bearer <token>` for all same-origin server-function calls.
// This makes `requireSupabaseAuth` middleware work without manual wiring.

import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installServerFnAuth() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // Only patch same-origin requests targeting our app (server functions live under /_serverFn/)
      const url = typeof input === "string"
        ? input
        : input instanceof URL ? input.toString() : input.url;

      const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);

      if (isSameOrigin) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization") && !headers.has("Authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers.set("authorization", `Bearer ${token}`);
            return originalFetch(input, { ...init, headers });
          }
        }
      }
    } catch {
      // fall through to original fetch
    }
    return originalFetch(input, init);
  };
}
