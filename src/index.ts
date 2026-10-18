import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadStrideTools, type ToolDef } from "./stride.ts";
import { curatedTools } from "./tools.ts";
import { busnearbyTools } from "./busnearby.ts";

// Load the full Stride endpoint set once at startup from the live spec.
const strideTools = await loadStrideTools();
const allTools: ToolDef[] = [...curatedTools, ...busnearbyTools, ...strideTools.tools];

function buildServer(): McpServer {
  const server = new McpServer({ name: "transit-allinone-mcp", version: "0.3.0" });
  for (const t of allTools) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema }, async (args: any) => {
      try {
        const data = await t.handler(args ?? {});
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: String(err instanceof Error ? err.message : err) }] };
      }
    });
  }
  return server;
}

if (process.argv.includes("--list-tools")) {
  console.log(JSON.stringify(allTools.map((t) => t.name), null, 2));
  process.exit(0);
}

if (process.argv.includes("--stdio")) {
  await buildServer().connect(new StdioServerTransport());
} else {
  const token = process.env.MCP_AUTH_TOKEN;
  const port = Number(process.env.PORT ?? 3000);
  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") return Response.json({ ok: true, tools: allTools.length });
      if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });
      if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      const server = buildServer();
      await server.connect(transport);
      return transport.handleRequest(req);
    },
  });
  console.log(`transit-allinone-mcp listening on :${port} (POST /mcp), ${allTools.length} tools`);
}
