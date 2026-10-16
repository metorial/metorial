# <img src="logo.png" height="20"> Foursquare

Search and match places, retrieve details, photos and tips, identify geotagging candidates, confirm selections, and suggest corrections or missing places. All current responses retain the complete provider data.

Connect with **Places Service API Key** for the current Places API. Generate the service key in your project's Developer Console settings. Current tools use `fsq_place_id` identifiers and API version `2025-06-17`. A legacy Places API key or V2 OAuth token is not automatically treated as a service key.

The nine original V3 tools remain available with their original inputs and requests, marked deprecated. Foursquare's [official notice](https://docs.foursquare.com/developer/reference/upcoming-changes) lists May 15, 2026 as the V3 deprecation date. Use the replacement named in each tool's description for current API calls. A successful response from a deprecated endpoint is not guaranteed.

**OAuth 2.0** retains the V2 user authentication flow. `get_current_user` retrieves that user's profile; Places keys do not identify a user. V3 deprecation does not establish retirement of V2 or Personalization APIs. The integration does not expose geofencing, Studio datasets, Measurement, managed-user creation, or personalized recommendations.

See [API and compatibility details](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
