import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function resolveOrigin(request: Request, fallback: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }
  return fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = resolveOrigin(request, url.origin);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/projects";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/projects";
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const signIn = new URL("/sign-in", origin);
  signIn.searchParams.set("error", "The sign-in link is invalid or expired.");
  return NextResponse.redirect(signIn);
}
