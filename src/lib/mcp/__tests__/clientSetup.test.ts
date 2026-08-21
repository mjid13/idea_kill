import { describe, expect, it } from "vitest";
import { getMcpClientSetups } from "../clientSetup";

describe("MCP client setup instructions", () => {
  it("uses the deployment's canonical URL in copyable commands", () => {
    const url = "https://ideas.example/mcp";
    const setups = getMcpClientSetups(url);

    expect(setups.find((setup) => setup.id === "codex")?.command).toContain(`--url ${url}`);
    expect(setups.find((setup) => setup.id === "codex")?.command).toContain(`--oauth-resource ${url}`);
    expect(setups.find((setup) => setup.id === "claude-code")?.command).toContain(`ideaup ${url}`);
  });
});
