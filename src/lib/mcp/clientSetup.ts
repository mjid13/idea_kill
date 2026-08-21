export interface McpClientSetup {
  id: "codex" | "claude-code" | "other";
  title: string;
  description: string;
  command?: string;
  verification: string;
}

export function getMcpClientSetups(mcpUrl: string): McpClientSetup[] {
  return [
    {
      id: "codex",
      title: "Codex CLI",
      description: "Run these commands in a terminal:",
      command: `codex mcp add ideaup --url ${mcpUrl} --oauth-resource ${mcpUrl}\n\ncodex mcp login ideaup`,
      verification: "A browser opens for OAuth. Verify later with codex mcp get ideaup.",
    },
    {
      id: "claude-code",
      title: "Claude Code",
      description: "Add the remote HTTP server, then authenticate from inside Claude Code:",
      command: `claude mcp add --transport http --scope user ideaup ${mcpUrl}\n\nclaude`,
      verification: "In Claude Code, run /mcp, choose ideaup, and complete OAuth. Verify with claude mcp list.",
    },
    {
      id: "other",
      title: "Claude Desktop or another MCP client",
      description: "Choose “Add remote MCP server” (or Streamable HTTP), enter the URL above, and select OAuth when prompted.",
      verification: "The client should show IdeaUp tools after OAuth completes.",
    },
  ];
}
