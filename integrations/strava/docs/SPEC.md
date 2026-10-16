# Strava API integration

Connect a Strava athlete through OAuth to read activities, profile data, routes,
segments, clubs, and gear. Create manual activities, edit activity metadata,
update athlete weight, and star or unstar segments.

## Authentication

Authorization uses `https://www.strava.com/oauth/authorize`; token exchange and
refresh use `POST https://www.strava.com/oauth/token`. Access tokens expire after
six hours. The connection retains the latest refresh token, actual token expiry,
granted scopes, and athlete ID when Strava supplies them. Athletes can decline
individual permissions; reconnect with the needed permissions when access is denied.

The existing OAuth method requests `read`, `read_all`, `profile:read_all`,
`profile:write`, `activity:read`, `activity:read_all`, and `activity:write`.
`get_athlete_profile` identifies the authenticated athlete. Full profile and zones
require `profile:read_all`; weight updates and segment starring require
`profile:write`. Activity creation and editing require `activity:write`.
`activity:read_all` includes Only You activities; private routes and segments
require `read_all`. Existing connections retain their granted permissions.

## Tools

| Area | Tools and behavior |
| --- | --- |
| Athlete | `get_athlete_profile` returns identity and optionally zones and statistics. Statistics include only Everyone activities. Its complete profile includes available bikes and shoes for gear discovery. `update_athlete` updates weight. |
| Activities | `list_activities` pages by date; `get_activity` optionally includes comments, kudoers, and laps. `create_activity` creates manual activities; `update_activity` changes only supplied metadata. `get_activity_streams` returns normalized streams and the original response. |
| Comments | `list_activity_comments` exposes current `page_size` and `after_cursor` pagination without requiring a full activity read. |
| Segments | `explore_segments`, `get_segment`, `star_segment`, and `list_starred_segments` support discovery and favorites. `get_segment_efforts` reads the authenticated athlete's efforts through `/segment_efforts`; Strava requires a subscription. `get_segment_effort` retrieves one effort and optionally streams. `get_segment_streams` reads coordinate, distance, and altitude streams. |
| Routes | `list_routes` discovers routes. `get_route_details` returns complete route metadata, optionally streams, and prepares a GPX or TCX download. Export metadata contains the real authenticated provider download URL; preparation does not verify completion of the download. Legacy `get_route` retains its original inline export contract and is deprecated in favor of `get_route_details`. |
| Clubs and gear | `list_clubs`, `get_club`, and `get_gear` return club and equipment data. Existing optional club members, activities, and admins requests remain available for compatibility; the current published reference documents only club details and athlete club listing. Gear names are returned only when supplied by Strava. |

Tools preserve existing inputs and actual values. Gear names may be omitted when
Strava omits them. Active tools expose
the complete upstream response through an optional `raw` output; route exports
use the new metadata-only replacement. Pagination is per request: callers must
request subsequent pages; a count is the number returned, not the provider total.
This is one Strava API product, so separate product categories are unnecessary.

The new route, individual effort, segment stream, and comment tools accept exact
decimal-string identifiers. Numbers are accepted only within JavaScript's safe
integer range. Pass large IDs as strings, using route `id_str` where available;
converting an already rounded numeric ID to a string cannot recover its precision.
These tools retain the exact requested ID in their string metadata. Existing
tools retain their original numeric input contracts.

No webhook subscription, leaderboard, club membership mutation, or activity file
upload tool is registered. No undocumented export endpoints are used.

## Official references

- [API v3 reference](https://developers.strava.com/docs/reference/)
- [OAuth, scopes, and token refresh](https://developers.strava.com/docs/authentication/)
- [Published Swagger API definition](https://developers.strava.com/swagger/swagger.json)
- [Route model and exact string IDs](https://developers.strava.com/swagger/route.json)

Reviewed against these sources on 2026-10-15. Provider requests, OAuth rotation,
subscription access, and file downloads require live verification with an authorized account.
