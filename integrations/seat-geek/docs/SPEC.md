# SeatGeek API Specification

## Connection

Use a client ID from the [developer portal](https://developer.seatgeek.com/), with an optional client secret. Requests use the public Platform API at `https://api.seatgeek.com/2`. Optional affiliate and referral IDs provide link tracking. No OAuth scopes or resource IDs are required during setup.

## Tools

- `search_events`: search events with performer, venue, taxonomy, date, location, ticket-price, available-listing, and sorting filters. Supports bulk event IDs and performer roles.
- `get_event_details`: retrieve an event and its performers, venue, pricing, and ticket URL.
- `search_performers` and `get_performer_details`: discover performers, genres, external links, and sports divisions; retrieve known performer IDs in bulk.
- `search_venues` and `get_venue_details`: discover venues or retrieve known venue IDs, addresses, coordinates, and ticket URLs.
- `get_taxonomies` and `get_genres`: discover categories and music-genre filter values.
- `get_recommendations`: retrieve similar events or performers from performer/event seeds.

## Behavior and limitations

List searches expose page and per-page controls. Bulk ID lookup accepts pagination and sorting without other search filters. Latitude and longitude must be supplied together; zero coordinates and zero price boundaries are retained. Event recommendations require a location and all recommendations require a seed. `geoIp="true"` uses the requesting server's location; supply an explicit location for the user's area.

Date filters use UTC. Dates and times marked to be determined are estimates. Unavailable address components and external-link IDs are omitted from normalized fields; optional `raw` output retains original values, including nulls. Recommendation affinity uses the provider's affinity or score value.

The public API documents no current-user endpoint or webhook subscriptions. Tickets are purchased through returned SeatGeek URLs.

## Official documentation

[Platform API reference](https://seatgeek.github.io/) covers authentication, resources, pagination, filters, genres, and recommendations. The current [developer portal](https://developer.seatgeek.com/) requires JavaScript; the published reference contains older examples. Runtime availability and credentials must be verified separately.
