# Stormglass API integration

The integration reads global weather, marine, biological, solar, astronomical, elevation, and tide data through the documented v2 API. It uses an API key in the `Authorization` header. Connection configuration is empty; no OAuth scopes, refresh tokens, tenant IDs, or account discovery are needed.

## Tools and endpoints

| Tool | Method and path | Behavior |
| --- | --- | --- |
| `get_weather` | GET `/weather/point` | Forecasts and a 14-day forecast look-back; source-dependent forecast horizon. |
| `get_marine_data` | GET `/weather/point` | Marine parameters from the same weather endpoint. |
| `get_historical_weather` | GET `/historical/point` | Historical archive from 2014; requires start or end; up to 240 hours with end inclusive. Most recent data normally lags by seven days. |
| `get_bio_data` | GET `/bio/point` | Ocean biological and land soil parameter time series. Provider `data` maps to `hours`; legacy `hours` responses remain accepted. |
| `get_solar_data` | GET `/solar/point` | UV and solar radiation time series. Provider `data` maps to `hours`; legacy `hours` responses remain accepted. |
| `get_astronomy_data` | GET `/astronomy/point` | Daily sun/moon and twilight data. Preserves nested current/closest moon phases and exposes existing phase aliases. Null rise/set/twilight times are retained. |
| `get_elevation` | GET `/elevation/point` | Elevation or bathymetry in meters relative to sea level, including genuine zero and negative values. A missing/non-numeric elevation is an invalid upstream response. |
| `get_tide_data` | GET `/tide/sea-level/point`, `/tide/extremes/point` | Hourly relative tide heights, extremes, or both. Keeps metadata for both calls. |
| `list_tide_stations` | GET `/tide/stations`, `/tide/stations/area` | All stations or stations within a top-right/bottom-left coordinate box. |

Each tool preserves the complete original response in optional `raw`. Existing normalized output fields retain their original types and requiredness. No file-generating operations, account identity endpoint, webhooks, or pagination are documented for this API.

## Coordinates, times, sources, and units

Latitude must be between -90 and 90; longitude between -180 and 180. Parameter lists must include at least one nonblank name; source selection is optional and passed as a comma-separated list. No fixed allowlist blocks new provider parameters or sources.

Stormglass interprets all times as UTC and ignores an ISO timestamp's timezone component. UNIX timestamps use seconds; ISO date/hour prefixes are accepted. Start must not follow end. Historical data uses an inclusive final hour and supports a maximum 239-hour difference between start and end (240 hourly points). With one boundary omitted the provider computes it from the other. Astronomy supports up to ten days per request. Forecast availability varies by source; standard forecasts can reach ten days, while some AI sources can reach fifteen days.

Temperatures are in Celsius; wind/current speeds in meters per second; wave heights in meters; wave periods in seconds; precipitation in mm/hour; pressure in hPa; cloud cover and humidity in percent; visibility in kilometers. Solar radiation flux is in W/m². Bio salinity is in per mille and soil moisture is volumetric content; concentration units depend on the parameter. Provider values and source labels are preserved without unit conversion.

Tide datums are MSL (default), MLLW, LAT, MLW, MHW, MHHW, and HAT. Tide levels represent astronomical tide relative to the selected datum, not actual water depth or storm-surge effects. The tide sea-level end is inclusive; the extremes end is exclusive. Metadata includes the selected station and its distance from the requested coordinate in kilometers. Combined queries make two requests and preserve each one's quota/usage metadata.

## Errors and verification boundary

Blank API keys, invalid coordinates, empty parameter names, invalid bounding boxes, reversed recognized time ranges, and malformed provider response envelopes produce structured service errors. Upstream failures preserve provider messages and HTTP status through shared HTTP/error handling. No quota, coordinates, timestamps, station identity, or elevation values are synthesized.

This refresh was verified by package build, typecheck, scoped formatting/lint, and static schema comparison. No live provider requests, E2E suites, or evals were run.

## Official sources

- [Authentication](https://docs.stormglass.io/authentication.md)
- [Weather](https://docs.stormglass.io/weather.md), [historical](https://docs.stormglass.io/historical.md), [sources](https://docs.stormglass.io/sources.md)
- [Biological](https://docs.stormglass.io/bio.md), [solar](https://docs.stormglass.io/solar.md), [astronomy](https://docs.stormglass.io/astronomy.md)
- [Tides and stations](https://docs.stormglass.io/tide.md), [elevation](https://docs.stormglass.io/elevation.md)
- [UTC date/time semantics](https://docs.stormglass.io/misc.md), [error codes](https://docs.stormglass.io/errors.md)
