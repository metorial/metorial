# BART API specification

BART provides read-only departure estimates, trip plans, fare information, station details, route data, schedule data, service advisories, elevator bulletins, and active train counts.

This integration retains BART's legacy JSON API for compatibility. BART recommends its GTFS and GTFS-RT feeds for currently supported transit data standards; those feeds have different data and delivery contracts.

## Authentication

Provide a BART API key from [BART registration](https://api.bart.gov/api/register.aspx). Requests send the key as the `key` query parameter and request JSON with `json=y`. Keys are checked for a nonblank value locally; successful connection setup does not establish upstream key validity. There is no OAuth flow, token refresh, user profile, or current-account endpoint.

## Tools and workflows

| Tool | Provider commands | Behavior |
| --- | --- | --- |
| `get_real_time_departures` | `etd.aspx?cmd=etd` | One station or all stations, optional platform or direction filtering, optional line-color grouping. |
| `plan_trip` | `sched.aspx?cmd=depart` or `arrive` | Trip choices, fare classes, transfer legs, and platform information when provided. |
| `get_fare` | `sched.aspx?cmd=fare` | Fare classes between stations, including same-station excursion fares. |
| `get_station_info` | `stn.aspx?cmd=stns`, `stninfo`, `stnaccess` | Discover station abbreviations, inspect routes and platforms, and request parking, bike-share, elevator access, and transit details. |
| `get_route_info` | `route.aspx?cmd=routes`, `routeinfo` | Discover route numbers, then retrieve ordered station lists. Airport connector route numbers are included in discovery. |
| `get_schedule` | `sched.aspx?cmd=scheds`, `stnsched`, `routesched` | Available schedule versions, daily station departures, or route train runs. |
| `get_service_advisories` | `bsa.aspx?cmd=bsa`, `elev` | Active advisories and optional elevator status bulletins. A bulletin may summarize multiple outages or normal service. |
| `get_system_status` | `bsa.aspx?cmd=count` | Current active train count. |

Use `get_station_info` without a station abbreviation to discover stations. Use `get_route_info` without a route number to discover routes. Dates, times, fares, and HTML descriptions remain in the provider's format. Trip fare summaries prefer the current fare-class list over deprecated trip attributes.

The platform and direction departure filters are mutually exclusive and require a single station. Trip counts follow the documented whole-number limits: 0–3 before and 1–3 after the requested time. Station access information requires a station abbreviation. Invalid combinations produce a clear validation error.

The [October 31, 2019 changelog](https://api.bart.gov/docs/overview/changes.aspx) supersedes older endpoint examples: route discovery no longer supports `date`, and route schedules no longer support `time`. The optional public fields remain for compatibility, but nonblank values in these unsupported combinations produce an actionable error before any request. Omit `date` for route discovery; date selection remains available with `routeNumber` for route details. Omit `time` for full daily route schedules, or use `plan_trip` for a time-based itinerary. Unsupported parameters are never forwarded.

BART serializes XML attributes with an `@` prefix and may wrap text in `#cdata-section`. The integration normalizes those representations and accepts both singleton and array forms. HTTP errors, malformed envelopes, and explicit provider error responses fail the operation instead of producing empty success results. An empty real-time or trip list can still mean no matching service.

No downloads, write operations, webhooks, or polling triggers are exposed. Holiday and special-notice legacy commands were deprecated in June 2020 and are not offered.

## Official references

- [Legacy API overview](https://api.bart.gov/docs/overview/index.aspx)
- [API changelog](https://api.bart.gov/docs/overview/changes.aspx)
- [JSON output format](https://api.bart.gov/docs/overview/output.aspx)
- [Departure estimates](https://api.bart.gov/docs/etd/etd.aspx)
- [Depart](https://api.bart.gov/docs/sched/depart.aspx) and [arrive](https://api.bart.gov/docs/sched/arrive.aspx)
- [Fares](https://api.bart.gov/docs/sched/fare.aspx)
- [Station list](https://api.bart.gov/docs/stn/stns.aspx), [station information](https://api.bart.gov/docs/stn/stninfo.aspx), and [station access](https://api.bart.gov/docs/stn/stnaccess.aspx)
- [Route list](https://api.bart.gov/docs/route/routes.aspx) and [route information](https://api.bart.gov/docs/route/routeinfo.aspx)
- [Schedule versions](https://api.bart.gov/docs/sched/scheds.aspx), [station schedules](https://api.bart.gov/docs/sched/stnsched.aspx), and [route schedules](https://api.bart.gov/docs/sched/routesched.aspx)
- [Service advisories](https://api.bart.gov/docs/bsa/bsa.aspx), [elevators](https://api.bart.gov/docs/bsa/elev.aspx), and [train count](https://api.bart.gov/docs/bsa/count.aspx)
- [Deprecated holiday](https://api.bart.gov/docs/sched/holiday.aspx) and [special notices](https://api.bart.gov/docs/sched/special.aspx)
