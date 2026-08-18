import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { Trans } from "@/components/i18n/trans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next ?? "/projects";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/projects";
  return <main className="flex min-h-screen items-center justify-center px-4">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle><Trans text="Sign in to IdeaUp" /></CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground"><Trans text="Use a magic link to access our private projects." /></p>
        <MagicLinkForm next={next} />
      </CardContent>
    </Card>
  </main>;
}
