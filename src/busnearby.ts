// Direct HTTP client for the BusNearby REST API (https://api.busnearby.co.il).
// Endpoints and parameter names mirror the busnearby-mcp reference implementation.
import { z } from "zod";
import type { ToolDef } from "./stride.ts";

export const BUSNEARBY_BASE = (process.env.BUSNEARBY_BASE_URL ?? "https://api.busnearby.co.il").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.BUSNEARBY_TIMEOUT_MS ?? 15000);

export class BusNearbyError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "BusNearbyError";
  }
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, BUSNEARBY_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new BusNearbyError(`BusNearby request to ${path} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new BusNearbyError(`BusNearby ${path} returned ${res.status} ${res.statusText}`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new BusNearbyError(`BusNearby ${path} returned a non-JSON body`, res.status);
  }
}

export const geocode = (query: string, locale: "he" | "en" = "en") =>
  getJson<unknown[]>("/geocode", { query, locale });

export type DirectionsArgs = {
  fromPlace: string;
  toPlace: string;
  locale?: "he" | "en";
  arriveBy?: boolean;
  wheelchair?: boolean;
  mode?: string;
  showIntermediateStops?: boolean;
  numItineraries?: number;
  maxWalkDistance?: string;
  optimize?: "QUICK" | "SAFE" | "FLAT" | "GREENWAYS" | "TRIANGLE";
  ignoreRealtimeUpdates?: boolean;
  date?: string;
  time?: string;
};

export function directions(a: DirectionsArgs) {
  const params: Record<string, string> = {
    fromPlace: a.fromPlace,
    toPlace: a.toPlace,
    arriveBy: String(a.arriveBy ?? false),
    locale: a.locale ?? "en",
    wheelchair: String(a.wheelchair ?? false),
    mode: a.mode ?? "WALK,TRANSIT",
    showIntermediateStops: String(a.showIntermediateStops ?? true),
    numItineraries: String(a.numItineraries ?? 3),
    maxWalkDistance: a.maxWalkDistance ?? "1207",
    optimize: a.optimize ?? "QUICK",
    ignoreRealtimeUpdates: String(a.ignoreRealtimeUpdates ?? false),
  };
  if (a.date) params.date = a.date;
  if (a.time) params.time = a.time;
  return getJson<Record<string, unknown>>("/directions", params);
}

const LocationPlace = z
  .string()
  .regex(/^.+::-?\d+\.?\d*,-?\d+\.?\d*$/, "Location must be 'address::lat,lng'");

export const busnearbyTools: ToolDef[] = [
  {
    name: "busnearby_geocode",
    description: "Convert a place or address into coordinates and stop candidates via the BusNearby REST API (GET /geocode).",
    inputSchema: {
      query: z.string().min(1).describe("Place or address, e.g. 'Tel Aviv' or 'תל אביב'"),
      locale: z.enum(["he", "en"]).default("en"),
    },
    handler: ({ query, locale }) => geocode(query, locale),
  },
  {
    name: "busnearby_directions",
    description: "Public transit directions via the BusNearby REST API (GET /directions). Locations must be 'address::lat,lng' (use busnearby_geocode first). date and time must be given together.",
    inputSchema: {
      fromPlace: LocationPlace.describe("Origin 'address::lat,lng'"),
      toPlace: LocationPlace.describe("Destination 'address::lat,lng'"),
      locale: z.enum(["he", "en"]).default("en"),
      arriveBy: z.boolean().default(false),
      wheelchair: z.boolean().default(false),
      mode: z.string().default("WALK,TRANSIT"),
      showIntermediateStops: z.boolean().default(true),
      numItineraries: z.number().int().min(1).max(10).default(3),
      maxWalkDistance: z.string().regex(/^\d+$/).default("1207").describe("Meters"),
      optimize: z.enum(["QUICK", "SAFE", "FLAT", "GREENWAYS", "TRIANGLE"]).default("QUICK"),
      ignoreRealtimeUpdates: z.boolean().default(false),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD, with time"),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("HH:MM, with date"),
    },
    handler: (a) => {
      if ((a.date === undefined) !== (a.time === undefined)) throw new BusNearbyError("date and time must be provided together");
      return directions(a);
    },
  },
];
