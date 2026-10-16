# The Odds API specification

The integration exposes the provider’s V4 read APIs. Configure an API key;
requests send it as the `apiKey` query parameter. No resource IDs are required
at connection setup. The public API has no current-user endpoint or webhooks.

## Workflows

- Discover sport keys with `list_sports`.
- Discover events with `get_events`; retrieve sport-wide featured odds with
  `get_odds`, or event-specific extended markets with `get_event_markets` and
  `get_event_odds`.
- Retrieve results with `get_scores` and reference teams or individual-sport
  players with `get_participants`.
- On a paid plan, discover snapshots with `get_historical_events` and retrieve
  featured odds with `get_historical_odds`. Use
  `get_historical_event_markets` followed by `get_historical_event_odds` for
  event-specific historical markets.

All timestamps use the default ISO format. Historical results expose snapshot
navigation timestamps. Player-prop selections retain the player description.
Event-specific odds provide update timestamps at market level; bookmaker-level
`lastUpdate` is optional for that response. Sport-wide odds retain the existing
bookmaker timestamp field. Optional output metadata is returned only when the
provider supplies it. No tools generate or download files.

## Provider references

- [V4 endpoints and response examples](https://the-odds-api.com/liveapi/guides/v4/)
- [API errors](https://the-odds-api.com/liveapi/guides/v4/api-error-codes.html)
- [Rotation numbers](https://the-odds-api.com/releases/rotation-numbers.html)
