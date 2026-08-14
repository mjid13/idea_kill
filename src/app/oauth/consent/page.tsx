import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseProjectRepository } from "@/lib/projects/repository";
import { ConsentForm } from "@/components/auth/ConsentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  if (process.env.MCP_CONNECTIONS_ENABLED !== "true") notFound();
  const authorizationId = (await searchParams).authorization_id;
  if (!authorizationId) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/sign-in?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) return <main className="p-8">This authorization request is invalid or expired.</main>;
  if ("redirect_url" in data) redirect(data.redirect_url);
  const projects = await new SupabaseProjectRepository(supabase).getAll();
  return <main className="mx-auto max-w-2xl px-4 py-12">
    <Card><CardHeader><CardTitle>Connect an MCP client</CardTitle></CardHeader><CardContent>
      <ConsentForm authorizationId={authorizationId} clientName={data.client.name}
        clientUri={data.client.uri} redirectUri={data.redirect_uri}
        projects={projects.map((p) => ({ id: p.id, name: p.basicInfo.name }))} />
    </CardContent></Card>
  </main>;
}
