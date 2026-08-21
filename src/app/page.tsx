"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import {
  ArrowRight,
  BarChart3,
  Gauge,
  LineChart,
  Percent,
  PiggyBank,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { projectRepository } from "@/lib/storage/browserRepository";
import { exampleProject } from "@/lib/example";

const CALCULATES = [
  { icon: Target, title: "Market opportunity", description: "TAM, SAM, SOM, and the market penetration your plan actually requires." },
  { icon: TrendingUp, title: "Revenue potential", description: "MRR, ARR, and 12/24/36-month forecasts built from your growth assumptions." },
  { icon: Percent, title: "Unit economics", description: "CAC, LTV, LTV:CAC, gross margin, and CAC payback — benchmarked by business model." },
  { icon: BarChart3, title: "Break-even", description: "Contribution margin, break-even customers, and break-even revenue." },
  { icon: PiggyBank, title: "Cash runway", description: "Burn rate and months of runway at your current spend." },
  { icon: LineChart, title: "Product validation", description: "Problem severity, demonstrated demand, and a separate validation maturity stage." },
  { icon: ShieldAlert, title: "Risk", description: "Technical, market, regulatory, competitive, and financial risk, weighted transparently." },
  { icon: Gauge, title: "Overall viability", description: "A single 0-100 score with a confidence rating and a clear next step." },
];

export default function LandingPage() {
  const router = useRouter();
  const t = useAppTranslations();

  async function viewExample() {
    await projectRepository.save(exampleProject);
    router.push(`/project/${exampleProject.id}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pt-12 pb-12 text-center sm:pt-20 sm:pb-16">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            {t("Know if your product economics make sense before you spend months building it.")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("Enter your assumptions and instantly evaluate market size, unit economics, profitability, runway, and overall product viability.")}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="w-full sm:w-auto" render={<Link href="/new" />}>
              {t("Evaluate an Idea")} <ArrowRight />
            </Button>
            <Button size="lg" className="w-full sm:w-auto" variant="outline" onClick={viewExample}>
              {t("View Example")}
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("Sign in securely with a magic link. Your evaluations are stored privately in your account.")}
          </p>
        </section>

        <section className="border-t border-border bg-muted/30 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("What it calculates")}</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CALCULATES.map((item) => (
                <Card key={item.title} size="sm">
                  <CardContent>
                    <item.icon className="size-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{t(item.title)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t(item.description)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:py-16">
          <p className="text-sm text-muted-foreground">
            {t("This tool does not predict whether your startup will succeed. It evaluates the quality of your current assumptions and economics — so you know what to fix, validate, or build next.")}
          </p>
        </section>
      </main>
    </div>
  );
}
