import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HowToUseView } from "@/components/docs/HowToUseView";

const PRODUCTION_MCP_URL = "https://ideaup.mjidhub.com/mcp";

export const metadata: Metadata = {
  title: "How to use IdeaUp",
  description: "Learn how to evaluate an idea, understand the results, connect an AI model through MCP, and use IdeaUp safely.",
};

export default function HowToUsePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HowToUseView mcpUrl={PRODUCTION_MCP_URL} />
    </div>
  );
}
