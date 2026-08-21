import { assertProjectEncryptionReady } from "@/lib/security/projectEncryption";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

export function GET() {
  try {
    if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) throw new Error("storage");
    assertProjectEncryptionReady();
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
