export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Copy .env.example to .env.local.");
  return { url, key };
}

export function canonicalMcpUrl(): string {
  const configured = process.env.MCP_RESOURCE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/mcp`;
}
