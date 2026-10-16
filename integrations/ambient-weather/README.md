# Ambient Weather

Retrieve the latest reported and historical readings from Ambient Weather personal weather stations. Discover connected devices, inspect available sensor readings, and retrieve historical data in 5 or 30 minute increments. Available sensors depend on the station model.

Connect with an API key and application key from your [AmbientWeather.net account settings](https://ambientweather.net/account). Start with List Devices to discover station MAC addresses. Get Current Weather returns a station's latest reported reading; inspect its timestamp to check freshness. Get Device Data returns up to 288 historical readings per request, newest first, with an optional end date for querying older data.

This integration provides read-only REST tools. It does not maintain a realtime Socket.io subscription. See the [official API reference](https://ambientweather.docs.apiary.io/) for provider limits and data timing.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
