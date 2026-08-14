import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PREFIXES = ["/", "/sign-in", "/auth/callback", "/oauth/consent", "/mcp", "/.well-known/", "/health"];

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let env: ReturnType<typeof supabaseEnv>;
  try {
    env = supabaseEnv();
  } catch {
    return response;
  }
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => prefix === "/" ? path === "/" : path.startsWith(prefix));
  if (!data?.claims && !isPublic) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}
