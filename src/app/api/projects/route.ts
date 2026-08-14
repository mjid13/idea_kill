import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return Response.json({ error: { code: "FORBIDDEN", message: "Sign in required." } }, { status: 401 });
  try {
    return Response.json(await new SupabaseProjectRepository(supabase).getAll());
  } catch (error) {
    return Response.json({ error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Request failed." } }, { status: 500 });
  }
}
