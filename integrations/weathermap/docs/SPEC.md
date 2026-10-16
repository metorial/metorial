# OpenWeatherMap integration

## Authentication and configuration

Use an OpenWeather API key, sent as the `appid` query parameter. Empty keys are rejected. The connection stores the key once; tool configuration contains only units (`standard`, `metric`, or `imperial`) and weather-description language. No OAuth refresh is required. The documented weather APIs do not expose a current-user or account-profile endpoint.

## Supported tools

| Tool | Capability | Official reference |
| --- | --- | --- |
| `get_current_weather` | Current observations by coordinates; wind follows the configured units. | [Current weather](https://openweathermap.org/api/current) |
| `get_forecast` | Five-day forecast in three-hour intervals, with an optional whole-number count of 1–40. | [Five-day forecast](https://openweathermap.org/api/forecast5) |
| `geocode_location` | One of a location name, postal code, or coordinate pair. Direct and reverse result limits are whole numbers from 1–5. | [Geocoding](https://openweathermap.org/api/geocoding-api) |
| `get_air_quality` | Current, four-day forecast, or historical AQI and pollutant concentrations. History needs whole-second Unix start/end timestamps in ascending order from November 27, 2020. | [Air pollution](https://openweathermap.org/api/air-pollution) |
| `get_one_call_weather` | Current weather, minute precipitation, hourly/daily forecasts, and government alerts. Sections may be excluded. | [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| `get_historical_weather` | One timestamp from January 1, 1979 through four days ahead, or a calendar-day aggregation from January 2, 1979. The existing `hourlyData` output contains the requested timestamp data. | [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| `get_weather_overview` | Weather summary for today or tomorrow in the requested location's timezone. | [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| `get_weather_map_tile` | Downloadable PNG for `clouds_new`, `precipitation_new`, `pressure_new`, `wind_new`, or `temp_new`. Existing `tileUrl` is a credential-free endpoint. | [Weather Maps 1.0](https://openweathermap.org/api/weathermaps) |

## Limits

One Call tools require a separate subscription. Timestamp history and day aggregation have different supported date ranges. Overview dates use the location timezone, which is resolved by the provider. Coordinates remain the source of location selection; use geocoding for names or postal codes. Map zoom and tile coordinates must be integers; X/Y range from 0 through `2^zoom - 1`.

The provider recommends One Call 4.0 for new integrations. Existing One Call 3.0 tools keep their endpoint contracts. This integration does not expose solar, road-risk, agriculture, fire-risk, bulk-export, Weather Maps 2.0, AI Assistant session, or paid push-alert management APIs.

Missing optional measurements stay omitted. Missing required descriptions/results produce an explicit provider-response error rather than invented values. No triggers are registered.
