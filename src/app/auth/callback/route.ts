import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/projects";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/projects";
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const signIn = new URL("/sign-in", url.origin);
  signIn.searchParams.set("error", "The sign-in link is invalid or expired.");
  return NextResponse.redirect(signIn);
}
