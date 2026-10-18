# transit-allinone-mcp

An MCP server for Israeli public transit that combines the Open Bus Stride API (GTFS planned data and SIRI real-time data from the Hasadna project) with BusNearby routing.

## Tools

- search_lines: find bus lines by number or route name (GTFS routes for today).
- get_live_bus_positions: real-time SIRI vehicle positions inside a bounding box, optionally by line ref.
- get_stop_arrivals: planned arrivals at a GTFS stop id.
- get_route_stops: stop-by-stop timetable for a line between two times.
- plan_transit_route: BusNearby directions between two coordinates (needs BUSNEARBY_API_BASE).

## Setup

1. Install Bun (https://bun.sh).
2. bun install
3. Copy .env.example to .env and adjust values.
4. bun run start (HTTP on PORT, MCP endpoint POST /mcp, health at /health).
   Or bun run src/index.ts --stdio for local stdio clients.

Type check: bun run typecheck

## Deploy on Render

The included render.yaml defines a Docker web service with a /health check. Create a Blueprint from this repo in the Render workspace, then set BUSNEARBY_API_BASE if you have one. MCP_AUTH_TOKEN is generated automatically; send it as a Bearer token.

## Data sources and caveats

- Open Bus Stride API: https://open-bus-stride-api.hasadna.org.il/docs (planned data is GTFS-based; real-time is from SIRI snapshots and can lag).
- BusNearby geocoding is available through the existing busnearby-mcp server. The BusNearby HTTP directions endpoint used by plan_transit_route is not verified yet, so that tool is a placeholder until its base URL and route are confirmed.
- Stride GTFS date filters use YYYY-MM-DD. Stride time filters require timezone offsets.
