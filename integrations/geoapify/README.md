# <img src="logo.png" height="20"> Geoapify

Geocode addresses, reverse geocode coordinates, and autocomplete addresses. Calculate routes and route matrices across multiple travel modes. Generate isochrones and isodistances, retrieve deferred isolines as downloadable GeoJSON, search places, and inspect place details. Look up postcodes, administrative boundaries, and IP geolocation, or match GPS traces to roads. Submit up to 1000 addresses or coordinates for batch geocoding and retrieve completed results as downloadable JSON.

For a reverse batch, submit coordinates with `batch_reverse_geocode`, then pass its job ID to `check_batch_geocode` with `direction: "reverse"`. For a deferred isoline, pass the ID returned by `calculate_isoline` to `check_isoline`. Provider result IDs remain available for 24 hours.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
