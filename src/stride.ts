// Client for the Open Bus Stride REST API (https://open-bus-stride-api.hasadna.org.il).
export const STRIDE_BASE = "https://open-bus-stride-api.hasadna.org.il";

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
