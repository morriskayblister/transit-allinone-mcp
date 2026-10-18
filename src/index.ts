import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools.ts";

function buildServer(): McpServer {
  const server = new McpServer({ name: "transit-allinone-mcp", version: "0.1.0" });
  for (const t of tools) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema }, async (args: any) => {
      try {
        const data = await t.handler(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: String(err instanceof Error ? err.message : err) }] };
      }
    });
  }
  return server;
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
      if (url.pathname === "/health") return Response.json({ ok: true });
      if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });
      if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      // Stateless: a fresh server and transport per request.
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      const server = buildServer();
      await server.connect(transport);
      return transport.handleRequest(req);
    },
  });
  console.log(`transit-allinone-mcp listening on :${port} (POST /mcp)`);
}
