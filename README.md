# transit-allinone-mcp

An MCP server for Israeli public transit. It combines the Open Bus Stride API (GTFS planned data and SIRI real-time data from the Hasadna project) with the BusNearby REST API, called directly over HTTP.

## Direct BusNearby endpoints

- GET https://api.busnearby.co.il/geocode?query=...&locale=en|he
- GET https://api.busnearby.co.il/directions?fromPlace=addr::lat,lng&toPlace=addr::lat,lng&arriveBy&locale&wheelchair&mode&showIntermediateStops&numItineraries&maxWalkDistance&optimize&ignoreRealtimeUpdates[&date=YYYY-MM-DD&time=HH:MM]

These are the same endpoints and parameter names used by the busnearby-mcp reference implementation. No other MCP server is involved.

## Tools

BusNearby (direct REST):
- busnearby_geocode: place or address to coordinates and stop candidates.
- busnearby_directions: full public transit directions with all documented options.
- plan_transit_route: simplified directions wrapper.

Stride (Open Bus Stride, direct REST):
- search_lines, get_live_bus_positions, get_stop_arrivals, get_route_stops (curated).
- stride_<path> for every GET endpoint in the live OpenAPI spec, plus stride_query as a generic pass-through.

## Setup

1. Install Bun (https://bun.sh).
2. bun install
3. Copy .env.example to .env if you want to change defaults.
4. bun run start (HTTP on PORT, MCP endpoint POST /mcp, health at /health).
   Or bun run src/index.ts --stdio for local stdio clients.
5. bun run src/index.ts --list-tools prints the tool names.

Type check: bun run typecheck

## Deploy on Render

The included render.yaml defines a Docker web service with a /health check. Create a Blueprint from this repo in the Render workspace. MCP_AUTH_TOKEN is generated automatically; send it as a Bearer token.

## Caveats

- BusNearby has no documented stop-search or stop-info REST endpoint in the reference implementation, so stop lookup goes through Stride (get_stop_arrivals, stride_gtfs_stops_list) rather than BusNearby.
- Stride time filters require timezone offsets. GTFS date filters use YYYY-MM-DD.
- Verified directly on the day of writing: https://api.busnearby.co.il/geocode and /directions both returned HTTP 200.
- Bun type checking and the server start were not run in the authoring environment, so run bun run typecheck before deploying.
