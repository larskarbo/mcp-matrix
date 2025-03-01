import { mcpServer } from "./mcpServer";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  // using console.error to avoid mcp server output with stdout
  console.error("Starting MCP server...");
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("MCP server connected");
}

main().catch((err) => {
  console.error("Error running MCP server:", err);
  process.exit(1);
});
