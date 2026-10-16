# Solcast

Use an API key from the [Solcast Toolkit](https://toolkit.solcast.com.au/). Requests use Bearer authentication over HTTPS. Keys remain valid until revoked, and each account's product permissions govern which endpoints are available. No additional connection configuration is required.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_radiation_and_weather` | Forecast, live, or historical irradiance and weather at a latitude/longitude. Select desired output parameters and time resolution. |
| `get_rooftop_pv_power` | Forecast, live, or historical rooftop generation for a system specified by location and capacity in kW. |
| `get_advanced_pv_power` | Forecast, live, or historical power for a configured Advanced PV Power resource. |
| `get_tmy_data` | Typical Meteorological Year weather, rooftop power, or advanced power data. |
| `get_grid_aggregations` | Live or forecast data for a collection configured by Solcast; optionally select an aggregation within it. |
| `get_horizon_angle` | Terrain elevation angles around a location, divided into a whole number of azimuth intervals. |
| `list_pv_power_sites` | Discover sites and resource IDs, filter by name/ID, entitlement or creation date, or retrieve one site. |
| `manage_pv_power_site` | Create, patch, replace, or delete site specifications. |
| `submit_site_measurements` | Submit 1–1000 power and operating-condition records for an Advanced PV Power site. |

Time-series results retain all provider fields within each data point. Site operations return the provider's complete site object. Site listing exposes the provider's total count, offset and query metadata. Optional `skip` and `take` select a page without changing the provider defaults when omitted. Increase `skip` by the returned page length until `offset + sites.length` reaches `totalCount`, or the page is empty. `skip` must be a nonnegative whole number and `take` a positive whole number. Measurement submission returns the complete provider response.

## Dates, periods and orientation

Historical requests need `start` and either `end` or `duration`, covering a positive interval of no more than 31 days. `hours` applies to live/forecast requests. Historical data begins in 2007 and ends seven days before the present; live estimates cover the recent period. Availability varies by product.

Historical and TMY `timeZone` accepts UTC, longitudinal time, numeric UTC offsets from -13 to 13 in quarter-hour increments, and equivalent fixed offsets such as `+10:00`. Forecast and live `hours`, and horizon `azimuthIntervals`, must be positive whole numbers; their input types remain numbers.

Azimuth uses north = 0°, east = -90°, and west = +90°. Tilt is measured from horizontal, between 0° and 90°. Standard time series support PT5M, PT10M, PT15M, PT20M, PT30M and PT60M. TMY supports PT15M, PT20M, PT30M and PT60M. Current TMY probabilities are P50, P75, P90 and P95; the legacy P10 option remains visible for compatibility and produces a clear unsupported-value error. If supplied together, GHI and DNI weights must sum to one; supplying one weight fills its complement.

## Advanced PV sites and adjustments

Create and replace require name, latitude, longitude, AC/DC capacities, tracking type and installation date. `list_pv_power_sites` discovers the `resource_id` used by subsequent operations. Site inputs `capacity`, `capacityDc` and `gridExportLimit` use kW; returned provider site metadata uses MW. Set `gridExportLimit` to -1 to remove a configured limit. Monthly dust-soiling averages require exactly 12 loss fractions between zero and one. Optional tracker and bifacial configuration fields are available.

The API uses numeric operational overrides. `availabilityPercent` is a percentage, `constraintPowerMw` is an AC cap in MW, and `dustSoilingLoss`/`snowSoilingLoss` are loss fractions. These override the older boolean inputs. For compatibility, false availability requests 100%; false dust/snow inputs request zero loss, while true defers to provider defaults. The legacy `applyConstraint` flag is retained; use `constraintPowerMw` to set a request cap, or update the site's export limit to change its configured limit.

`siteTag` and `confirmOverwrite` remain available as legacy inputs and are forwarded unchanged, but the current resource API does not document them. `showAll` requires administrator privileges.

Measurement power and limit fields use MW. Each record needs a timezone-bearing `periodEnd` and a positive ISO 8601 period duration. This tool targets Advanced PV resources; Premium PV measurements use a separate API.

## API reference

[Authentication](https://docs.solcast.com.au/docs/authentication), [irradiance/weather](https://docs.solcast.com.au/docs/section/irradiance-weather-data), [rooftop PV](https://docs.solcast.com.au/docs/section/rooftop-pv-power), [advanced PV and resources](https://docs.solcast.com.au/docs/section/advanced-pv-power), [grid aggregations](https://docs.solcast.com.au/docs/section/grid-aggregations), [geographic data](https://docs.solcast.com.au/docs/section/geographic), and [errors](https://docs.solcast.com.au/docs/errors).
