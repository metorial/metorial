# <img src="logo.png" height="20"> Strava

Read, create, and update Strava activities. Retrieve the connected athlete's profile, zones, statistics, gear, and clubs. Read activity streams and page through comments. Explore and star segments, discover starred segments, and inspect segment efforts and streams. Read routes and prepare GPX or TCX downloads with `get_route_details`.

Permissions depend on the scopes the athlete grants. Private routes and segments require `read_all`; Only You activities require `activity:read_all`. Segment effort access may require a Strava subscription. Legacy `get_route` remains available with its original output and is deprecated in favor of `get_route_details`.

See [the API specification](docs/SPEC.md) for scope requirements, pagination, and compatibility details.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
