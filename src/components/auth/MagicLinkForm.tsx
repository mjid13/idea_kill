"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppTranslations } from "@/components/i18n/use-app-translations";

export function MagicLinkForm({ next }: { next: string }) {
  const t = useAppTranslations();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(undefined);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error } = await createBrowserSupabaseClient().auth.signInWithOtp({
      email, options: { emailRedirectTo: callback.href },
    });
    setMessage(error ? error.message : t("Check the inbox for the secure sign-in link."));
    setBusy(false);
  }
  return <form onSubmit={submit} className="space-y-4">
    <Input type="email" required autoComplete="email" value={email}
      onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
    <Button type="submit" className="w-full" disabled={busy}>{busy ? t("Sending…") : t("Email me a sign-in link")}</Button>
    {message && <p className="text-sm text-muted-foreground">{message}</p>}
  </form>;
}
