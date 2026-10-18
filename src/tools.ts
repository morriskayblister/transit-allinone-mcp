import { z } from "zod";
import { stride, isoMinutesAgo, today, type ToolDef } from "./stride.ts";
import { directions } from "./busnearby.ts";

// Curated, human-friendly tools built on top of the Stride endpoints.
export const curatedTools: ToolDef[] = [
  {
    name: "search_lines",
    description: "Search Israeli bus lines (GTFS routes) for today by line number or part of the route name. Returns line refs usable with other tools.",
    inputSchema: {
      line_number: z.string().optional().describe("Exact public line number, e.g. '5'"),
      name_contains: z.string().optional().describe("Part of the route long name, e.g. 'Dizengoff'"),
      limit: z.number().int().min(1).max(500).default(50),
    },
    handler: ({ line_number, name_contains, limit }) =>
      stride("/gtfs_routes/list", { date_from: today(), date_to: today(), route_short_name: line_number, route_long_name_contains: name_contains, limit }),
  },
  {
    name: "get_live_bus_positions",
    description: "Latest real-time (SIRI) vehicle positions inside a bounding box, optionally filtered by SIRI line ref. Looks back a few minutes.",
    inputSchema: {
      min_lat: z.number(), max_lat: z.number(), min_lon: z.number(), max_lon: z.number(),
      line_ref: z.string().optional().describe("SIRI line ref from search_lines"),
      minutes_back: z.number().int().min(1).max(60).default(5),
      limit: z.number().int().min(1).max(500).default(100),
    },
    handler: ({ min_lat, max_lat, min_lon, max_lon, line_ref, minutes_back, limit }) =>
      stride("/siri_vehicle_locations/list", {
        lat__greater_or_equal: min_lat, lat__lower_or_equal: max_lat,
        lon__greater_or_equal: min_lon, lon__lower_or_equal: max_lon,
        recorded_at_time_from: isoMinutesAgo(minutes_back),
        siri_routes__line_ref: line_ref,
        order_by: "recorded_at_time desc",
        limit,
      }),
  },
  {
    name: "get_stop_arrivals",
    description: "Planned arrivals for a GTFS stop id (from gtfs_stops). Only planned GTFS times are currently available here.",
    inputSchema: {
      gtfs_stop_id: z.number().int().describe("GTFS stop id"),
      limit: z.number().int().min(1).max(500).default(50),
    },
    handler: ({ gtfs_stop_id, limit }) => stride("/stop_arrivals/list", { gtfs_stop_id, limit }),
  },
  {
    name: "get_route_stops",
    description: "Stop-by-stop planned timetable of a bus line between two times (ISO 8601 with timezone, e.g. 2026-10-18T08:00:00+03:00).",
    inputSchema: {
      line_ref: z.string().describe("Line ref from search_lines"),
      from: z.string().describe("Planned start time from, ISO 8601 with timezone"),
      to: z.string().describe("Planned start time to, ISO 8601 with timezone"),
      limit: z.number().int().min(1).max(500).default(200),
    },
    handler: ({ line_ref, from, to, limit }) =>
      stride("/route_timetable/list", { line_refs: line_ref, planned_start_time_date_from: from, planned_start_time_date_to: to, limit }),
  },
  {
    name: "plan_transit_route",
    description: "Plan a public transit route between two 'address::lat,lng' points by calling the BusNearby REST API directly (GET /directions). Wraps busnearby_directions with a simpler interface.",
    inputSchema: {
      from_place: z.string().describe("Origin as 'address::lat,lng'"),
      to_place: z.string().describe("Destination as 'address::lat,lng'"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD, with time"),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("HH:MM, with date"),
      arrive_by: z.boolean().default(false),
      wheelchair: z.boolean().default(false),
      num_itineraries: z.number().int().min(1).max(10).default(3),
    },
    handler: ({ from_place, to_place, date, time, arrive_by, wheelchair, num_itineraries }) => {
      if ((date === undefined) !== (time === undefined)) throw new Error("date and time must be provided together");
      return directions({ fromPlace: from_place, toPlace: to_place, date, time, arriveBy: arrive_by, wheelchair, numItineraries: num_itineraries });
    },
  },
];
