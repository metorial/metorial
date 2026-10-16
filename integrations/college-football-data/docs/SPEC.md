# College Football Data Integration

College Football Data provides college football schedules, results, play-by-play,
statistics, recruiting, ratings, betting lines, and historical reference data.
The integration uses the documented REST API at
`https://api.collegefootballdata.com` with an API key supplied as
`Authorization: Bearer <key>`. Request a key at
https://collegefootballdata.com/key. Enter the key without a Bearer prefix.

## Available workflows

- Find games by season, week, team, conference, division, home/away team, or game ID.
- Get team and player box scores plus optional advanced box scores.
- Get current scoreboard data or a game's live play-by-play and metrics.
- Get the active or next schedule slate, or an explicit season/week window.
- Discover a season's calendar and retrieve game broadcast information.
- Find teams, rosters, talent, records, and against-the-spread records.
- Get complete stored team and player season overviews; discover player IDs with
  `search_players` and teams with `get_team_info`.
- Retrieve season statistics, player usage, returning production, recruiting,
  transfers, coaching records, and NFL Draft picks.
- Retrieve poll rankings and SP+, SRS, Elo, FPI, and optional CORE ratings.
- Retrieve historical plays and optionally matching drives, win probabilities,
  team season PPA, and adjusted efficiency metrics.
- Retrieve the College Football Playoff bracket, including participants and rounds.
- Discover conferences and stadiums, and inspect the authenticated account's
  access tier, feature availability, and remaining call quota.

## Request and response behavior

Existing tool filters and output fields remain available. Records preserve the
provider's full response, including IDs, metadata, missing fields, and nulls.
Player search returns at most 100 provider matches. Its optional `limit` selects
from those returned matches and does not increase the provider’s result ceiling.

A season or team is required for team season statistics, season PPA, and some
recruiting queries. Betting lines require year or game ID. Talent and ATS records
require year. Explicit schedule requests require year, season type, and week
together. Integer-valued provider filters are checked before sending a request.
Invalid filters and provider errors return actionable errors with upstream HTTP
status and available validation details.

This is one REST API product. Its endpoint groups are data families within that
product. GraphQL subscriptions and other sports APIs are outside this integration.
The REST reference does not document webhook registration.

## Access limits

Some live and adjusted-metric operations require paid access. Available data and
quotas depend on the connected account; `get_account_info` reports the provider's
current account access information. There is no documented email or stable user
ID in that endpoint, so the integration does not invent either value. Calls are
not silently retried, and broad list queries can consume account quota.

## Official references

- [Authentication](https://api.collegefootballdata.com/authentication)
- [OpenAPI 5.32.1](https://api.collegefootballdata.com/api/5.32.1/cfbd-openapi.json)
- [Games, calendar, schedule, scoreboard, and box scores](https://api.collegefootballdata.com/api/games)
- [Players and season overviews](https://api.collegefootballdata.com/api/players)
- [Teams and season overviews](https://api.collegefootballdata.com/api/teams)
- [Metrics and PPA](https://api.collegefootballdata.com/api/metrics)
- [Ratings](https://api.collegefootballdata.com/api/ratings)
- [Account and quota information](https://api.collegefootballdata.com/api/info)
- [Usage and access](https://api.collegefootballdata.com/usage-and-access)

The endpoint methods, parameters, and response shapes were checked against the
linked official OpenAPI document. No authenticated provider requests are implied
by this documentation.
