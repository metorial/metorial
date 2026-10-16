# Tripadvisor

Search for hotels, restaurants, and attractions by keyword or geographic coordinates. Retrieve detailed location information including ratings, reviews, photos, addresses, and rankings. Map external properties to Tripadvisor location IDs. Create, read, update, and cancel guest review email requests through Review Express, and discover mapped partner properties with their opt-in status.

The primary API key supports Content API calls. Set the optional separate Review Express API key when your connectivity account uses a different key. Existing connections continue to use their saved primary key when no separate key is configured. Review Express generally expects your mapped partner property ID, which can be discovered with `list_location_mappings`.

The location mapper and email-request opt-in tools retain their existing routes for compatibility. The mapper documentation is marked outdated by Tripadvisor; `list_location_mappings` uses the documented Review Express property mapping route. Review Express requires an approved connectivity account, completed property mapping, and hotel opt-in.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
