Let me fetch the main SeatGeek API documentation page for more detailed feature information.# Slates Specification for Seat Geek

## Overview

SeatGeek is a ticketing platform for live events (sports, concerts, theater) primarily in the United States and Canada. Its API can return events, performers, venues, and recommendations, but the API does not support the process of booking or buying tickets through SeatGeek.

## Authentication

SeatGeek uses **Client Credentials** (a `client_id` and `client_secret`) for authentication. SeatGeek provides a client ID and secret, which you can get from SeatGeek's developer platform at [seatgeek.com/account/develop](https://seatgeek.com/account/develop).

You can still be authenticated if you only pass the client ID and an empty string as the client secret.

There are two ways to pass credentials:

1. **Query String Parameters**: Append `client_id` and optionally `client_secret` as query parameters to any API request. For example: `https://api.seatgeek.com/2/events?client_id=MYCLIENTID&client_secret=MYCLIENTSECRET`

2. **HTTP Basic Auth**: The HTTP Basic Auth token is a token that an HTTP client can use to provide a user identifier and password when making an API request. Pass the `client_id` as the username and `client_secret` as the password, Base64-encoded in the `Authorization` header.

There are no OAuth flows or scopes for the public Platform API. No additional tenant IDs or custom inputs are required.

**API Base URL**: `https://api.seatgeek.com/2`

## Features

### Event Search & Discovery

Search and retrieve live events with rich filtering capabilities. Events include details like title, date/time, venue, performers, ticket stats (listing count, average/lowest/highest price), and popularity scores.

- Filter by performers (by ID or slug, with specificity like `home_team`, `away_team`, `primary`), venue (by ID, city, state), taxonomies (e.g., sports, concerts), and date/time ranges using comparison operators (`gt`, `gte`, `lt`, `lte`).
- Filter by ticket listing attributes such as `listing_count`, `average_price`, `lowest_price`, and `highest_price`.
- Full-text search via a `q` parameter supporting natural language queries (e.g., "yankees march").
- Supports geolocation filtering by IP address, postal code, or lat/lon coordinates with configurable search radius.
- The API does not support booking or buying tickets through SeatGeek. Users should be directed to the SeatGeek event URL for ticket purchases.

### Performer Lookup

Search and retrieve performer information including name, images (multiple sizes), popularity score, associated taxonomies, genres, and external links (Spotify, Last.fm).

- Filter by taxonomy, genre (by slug, including primary genre), ID, or slug.
- Full-text search via a `q` parameter.
- Performers include a `has_upcoming_events` flag and division/conference membership data for sports teams.

### Venue Lookup

Search and retrieve venue information including name, full address, geolocation (lat/lon), and popularity score.

- Filter by city, state, country, or postal code.
- Full-text search via a `q` parameter.
- Supports geolocation-based searching.

### Taxonomies

Retrieve the full list of event categorization taxonomies (e.g., sports, concerts, theater, monster trucks). Taxonomies are hierarchical with parent-child relationships. Used for filtering events and performers by category.

### Recommendations

The SeatGeek API supports retrieval of recommended performers based on one of several different 'seed' types. A seed can be thought of as "X in the request, give me performers similar to X".

- **Event Recommendations**: Get recommended events seeded by performer IDs or an event ID. Geolocation is required, and results are scored by affinity. Supports the same filtering options as the events endpoint (date, venue, taxonomy).
- **Performer Recommendations**: Get recommended performers seeded by performer IDs or an event ID, scored by affinity.
- Supports multiple seeds in a single request for more nuanced recommendations.

### Partner Affiliate Tracking

Built-in support for partner affiliate programs via `aid` and `rid` parameters that get appended to all returned URLs, enabling revenue tracking for referred ticket purchases.

## Events

The provider does not support events. SeatGeek's public Platform API does not offer webhooks, event subscriptions, or any built-in push/polling mechanism for receiving notifications about changes to events, performers, or venues.
