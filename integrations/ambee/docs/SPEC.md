# Ambee Integration

## Authentication

Use the API key from the [Ambee API Dashboard](https://api-dashboard.getambee.com/). Requests send the key in the `x-api-key` header. The integration accepts an optional response language and an imperial or SI weather unit configuration. No OAuth flow or resource ID configuration is required.

## Current APIs

- `query_environment`: current v3 air quality (`aq`), pollen, and weather APIs; latest, history, and forecast periods; either coordinates or a place name. Historical queries require both timestamps and support a maximum 48-hour window. Forecasts cover 48 hours; pollen and weather additionally support 120 hours at three-hour intervals. AQI standards, local timestamps, and species risk are available for the applicable dataset. The complete provider response is returned.
- `query_disasters`: processed disaster events from the last month by coordinates, country, or continent, with event type filters and pagination. Use a returned event ID with `action: polygon` to retrieve affected geometry. The complete provider response is returned.
- `get_wildfire_risk`: four-week predictive fire risk by coordinates or place, for North America.
- `geocode`: forward and reverse location lookup.

## Compatibility tools

Existing air quality, pollen, weather, wildfire activity, natural disaster history, elevation, soil, water vapor, and vegetation tools keep their public schemas and identifiers. Some use legacy endpoints absent from the current endpoint catalog. Current documentation and older official playground examples differ; these tools have not been verified against a live subscription. Use the current API tools for newly authored climate and recent-disaster queries.

Errors include provider messages and HTTP status where available. Invalid location selections, incomplete historical ranges, and fractional pagination fail with actionable messages. A provider deprecation status is reported as an error instead of appearing as an empty successful result.

## Coverage and limits

Twenty read-only tools cover one environmental intelligence product across multiple datasets. The documented API does not expose a suitable current-user endpoint. Map tiles, invite-only webhook services, bulk historical downloads, beta illness forecasts, and solar parameters are outside this integration's current tool surface. No webhook triggers are registered.

## Official references

- [Overview, authentication, errors, and endpoint catalog](https://docs.ambeedata.com/apis/overview)
- [Air quality](https://docs.ambeedata.com/apis/air-quality)
- [Pollen](https://docs.ambeedata.com/apis/pollen)
- [Weather](https://docs.ambeedata.com/apis/weather)
- [Natural disasters](https://docs.ambeedata.com/apis/natural-disasters)
- [Fire risk](https://docs.ambeedata.com/apis/fire)
- [Location services](https://docs.ambeedata.com/apis/location)
