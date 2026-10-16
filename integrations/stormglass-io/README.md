# <img src="logo.svg" height="20"> Stormglass Io

Retrieve global weather, marine, tide, astronomy, solar, and elevation data for any coordinate. Fetch weather forecasts and historical data including temperature, wind, precipitation, humidity, and cloud cover. Access marine parameters such as wave height, swell, currents, and water temperature. Get tide sea-level predictions and high/low tide extremes. Retrieve sunrise, sunset, moonrise, moonset, and moon phase information. Fetch solar radiation and UV index data. Look up elevation for any point. Supports multiple meteorological data sources with configurable date ranges and parameter selection.

## Usage notes

- All request and response times use UTC. The API accepts UNIX seconds and ISO date/time prefixes; it ignores ISO timezone offsets. Adjust local times to UTC before querying.
- Use `get_weather` for forecasts and its 14-day forecast look-back, and `get_historical_weather` for the historical archive from 2014. Historical requests require `start` or `end`, return up to 240 hourly points, and normally lag by at least seven days. Source availability varies.
- Weather and marine values retain the provider's source keys. Temperatures are in Celsius, wind/current speed in meters per second, wave heights in meters, periods in seconds, pressure in hPa, and visibility in kilometers.
- Tide heights are relative to the selected datum and are not water depth. `get_tide_data` supports MSL, MLLW, LAT, MLW, MHW, MHHW, and HAT. Its `end` is inclusive for sea level and exclusive for extremes.
- Every result includes the original provider response in `raw`. Combined tide queries also expose separate metadata for each request, including quota cost and station distance in kilometers.
- Authentication uses an API key in the Authorization header. The public API does not document an account identity endpoint or pagination; station listings return all matching stations.

Official reference: [Stormglass API documentation](https://docs.stormglass.io/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
