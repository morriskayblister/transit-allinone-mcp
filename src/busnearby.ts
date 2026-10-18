// BusNearby client. Geocoding is served by the existing busnearby-mcp server.
// plan_transit_route calls BUSNEARBY_API_BASE (configured via env). The exact
// route for directions is NOT verified yet; see README.
const BASE = process.env.BUSNEARBY_API_BASE?.replace(/\/$/, "");

export function busnearbyConfigured(): boolean {
  return Boolean(BASE);
}

export async function busnearbyDirections(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }, when?: string) {
  if (!BASE) throw new Error("BUSNEARBY_API_BASE is not set");
  const url = new URL(`${BASE}/directions`);
  url.searchParams.set("origin", `${origin.lat},${origin.lon}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lon}`);
  if (when) url.searchParams.set("time", when);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`BusNearby directions failed: HTTP ${res.status}`);
  return res.json();
}
