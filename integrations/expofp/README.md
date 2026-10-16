# <img src="logo.png" height="20"> ExpoFP

Manage exhibitors, booth assignments, categories, extras, conference sessions, speakers, and tracks for exhibitions and events. Discover event IDs and expo keys with `list_events`.

Use `get_offline_plan` to check a floor-plan archive and `prepare_offline_plan` to start its build. When the latest archive is ready, preparation provides a downloadable ZIP for offline use. Builds can take several minutes; wait about 120 seconds between checks.

Connect with the API token from your [ExpoFP profile](https://app.expofp.com/). The JSON API sends the token in each request body. Offline archive endpoints are public and do not receive that token.

The [JSON API guide](https://developer.expofp.com/guide/json-api) links to the signed-in reference. The [Offline Data API guide](https://developer.expofp.com/guide/offline-api) documents archive versions, build status, and polling.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
