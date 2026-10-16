# Melo

Search, retrieve, and monitor French real estate property listings aggregated from 900+ sources. Filter properties by transaction type, property type, budget, surface area, location, and more. Retrieve detailed property information including price, geolocation, photos, energy ratings, and contact details. Find similar properties for market comparison. Create and manage saved searches with webhook notifications for new matches and advert-level events (price changes, new ads, expired listings). Access market analytics including price-per-meter evolution, location autocomplete, and points of interest.

Melo's official documentation now redirects to [Stream Estate](https://docs.stream.estate/). Select the `stream_estate` environment to use its documented production API at `https://api.stream.estate`. The existing `production` and `sandbox` environments retain their legacy Melo hosts.

Create an API key on the API Keys page in your account console. Use `location_autocomplete` or `list_cities` to discover city and department IRIs before applying location filters. Use `list_saved_searches` to discover saved search IDs and `get_saved_search` to inspect an individual search.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
