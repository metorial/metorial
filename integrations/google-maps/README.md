# <img src="logo.jpeg" height="20"> Google Maps

Access Google Maps Platform geospatial services through tools for geocoding, address validation, Places search and details, Places Autocomplete (New), place-photo downloads, directions and route matrices, elevation, time zones, air quality, road snapping, static-map URLs, and geolocation.

Place autocomplete supports Google billing session tokens, place/query predictions, type and region filters, origin distance, and circular location bias or restriction. Place Details returns current photo resource names and author attributions. `get_place_photo` downloads a current photo resource with Google-supported dimensions and returns validated image bytes only as a Slate attachment; temporary media URLs and API keys are never returned.

Use a Google Maps Platform API key from a billing-enabled project. Enable each API used by the selected tools, including Places API (New) for autocomplete, Place Details, and place photos. Apply server-side API and address restrictions appropriate for the runtime.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
