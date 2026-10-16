# IQAir AirVisual Specification

## Authentication

Create an API key in the [IQAir dashboard](https://dashboard.iqair.com/). The integration sends it as the `key` query parameter over HTTPS. No account identifier or OAuth setup is required.

## Tools

- `list_locations` browses countries, states, cities, and stations. Supply each parent location before requesting its children.
- `get_city_air_quality` reads a city selected from that directory.
- `get_nearest_air_quality` finds the nearest city using paired GPS coordinates, or the API request server's IP location when both coordinates are omitted.
- `get_station_air_quality` reads a named station using station, city, state, and country together, or finds the nearest station using paired coordinates or server IP location. Named and coordinate lookups are separate modes.
- `get_city_ranking` compares global city AQI values where supported by the connected API plan.

Observation tools preserve the existing current AQI, pollutant, location, weather, forecast, and history outputs. They additionally expose provider concentration units, daily forecasts, and felt temperature when available. Station observations also expose forecast and history records. Missing current air quality or weather produces a clear availability error; retry later or choose another location.

## Availability

Community supports current city AQI and weather. Startup adds station observations and pollutant concentrations. Enterprise adds daily and detailed forecasts and recent history. Forecast and history records are returned from the observation response; the tools do not query arbitrary historical date ranges. Data availability depends on the plan and reporting location.

The five tools cover the public outdoor v2 data routes. There is no documented current-user endpoint or webhook subscription. Device-specific API links use a separate access flow.

## References

- [Official AirVisual API documentation](https://api-docs.iqair.com/)
- [IQAir API plans](https://www.iqair.com/air-quality-monitors/api)
- [Station-specific device links](https://www.iqair.com/support/knowledge-base/how-do-i-get-my-stations-data-through-api)
