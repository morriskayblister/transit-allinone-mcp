// Open Bus Stride API client. Every GET endpoint in the live OpenAPI spec is exposed as an MCP tool.
import { z } from "zod";

export const STRIDE_BASE = "https://open-bus-stride-api.hasadna.org.il";

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (args: any) => Promise<unknown>;
};

export async function stride<T = unknown>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const url = new URL(path, STRIDE_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Stride ${path} failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const isoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
export const isoMinutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString().replace(/\.\d{3}Z$/, "+00:00");
export const today = () => new Date().toISOString().slice(0, 10);

function zodForParam(p: any): z.ZodTypeAny {
  const s = p.schema ?? {};
  const type = s.type ?? (s.anyOf ?? []).map((x: any) => x.type).find(Boolean) ?? "string";
  let t: z.ZodTypeAny;
  switch (type) {
    case "integer": t = z.number().int(); break;
    case "number": t = z.number(); break;
    case "boolean": t = z.boolean(); break;
    default: t = z.string();
  }
  return p.required ? t : t.optional();
}

// Fetch the live spec and build one tool per GET path. Throws if the spec cannot be loaded.
export async function loadStrideTools(): Promise<{ tools: ToolDef[]; paths: string[] }> {
  const res = await fetch(`${STRIDE_BASE}/openapi.json`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Could not load Stride OpenAPI spec: HTTP ${res.status}`);
  const spec: any = await res.json();
  const tools: ToolDef[] = [];
  const paths: string[] = [];
  for (const [path, item] of Object.entries<any>(spec.paths ?? {})) {
    const op = item?.get;
    if (!op) continue;
    paths.push(path);
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const p of op.parameters ?? []) {
      if (p.in !== "query") continue;
      shape[p.name] = zodForParam(p).describe(String(p.description ?? "").split("\n")[0].slice(0, 300));
    }
    const desc = `Open Bus Stride GET ${path}. ${String(op.description ?? op.summary ?? "").trim()}`.slice(0, 1200);
    tools.push({
      name: "stride_" + path.replace(/^\//, "").replace(/\//g, "_"),
      description: desc,
      inputSchema: shape,
      handler: (args: Record<string, unknown>) => stride(path, args as any),
    });
  }
  // Generic pass-through for any path in the spec, with raw query params.
  tools.push({
    name: "stride_query",
    description: `Generic pass-through to any Open Bus Stride GET endpoint. Valid paths: ${paths.join(", ")}`,
    inputSchema: {
      path: z.enum(paths as [string, ...string[]]).describe("Endpoint path, e.g. /siri_vehicle_locations/list"),
      params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Query parameters as key/value pairs"),
    },
    handler: ({ path, params }: { path: string; params?: Record<string, string | number | boolean> }) => stride(path, params ?? {}),
  });
  return { tools, paths };
}
