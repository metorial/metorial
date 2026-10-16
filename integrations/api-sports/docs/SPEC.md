# API-Sports

The integration uses direct API-Sports API keys in `x-apisports-key` and read-only GET requests. RapidAPI credentials are a separate service and are not accepted by this authentication method. No OAuth exchange or refresh is needed. `get_account_status` exposes the real account, subscription and request-usage endpoint.

Football uses v3, NBA uses v2, and the remaining sports use v1. NFL requests use `https://v1.american-football.api-sports.io`. Resource and filter availability differs between the sport APIs; unsupported combinations fail with an actionable error. Provider errors returned inside successful HTTP responses are treated as errors, including arbitrary field-specific error details.

## Discovery and data

- `get_seasons` discovers exact season keys. Football uses `/leagues/seasons`; other sports use `/seasons`. Basketball accepts exact split-year identifiers via additive `seasonName` inputs.
- `search_leagues` discovers numeric competition IDs and preserves season coverage. NBA returns named variants through `get_nba_leagues` instead. Formula 1 and MMA do not expose the numeric-league model.
- `search_teams` preserves team and venue information. NBA uses `nbaLeague` strings, with values discovered through `get_nba_leagues`.
- `get_fixtures` routes Football to fixtures, Formula 1 to races, MMA to fights and the team sports to games. NBA dates, visitor teams and scores, NFL nested game data and other sport-specific metadata are preserved. Only the sport's supported filters are forwarded.
- `get_standings` preserves Football tables and nested or flat team-sport standings. NBA has a dedicated named-league standings tool.
- `get_player_stats` returns Football profiles and season statistics. Basketball, NBA and NFL return player profiles; Formula 1 and MMA use drivers and fighters. Dedicated NBA statistics retain original game-by-game metrics.
- `get_team_statistics` retains Football season metrics and original available team-sport statistics. NBA uses its dedicated team season totals tool. NFL, Formula 1 and MMA do not share the league-team season-statistics endpoint.
- `get_odds` uses `fixture` for Football, `game` for team sports and `fight` for MMA. NFL requires a game. NBA and Formula 1 do not expose this endpoint. Football pagination is exposed and the original response is retained.
- Football-only tools cover match events, lineups and statistics, predictions, injuries, transfers, coaches, current squads and top scorers.
- MMA fight results and fighter statistics retain the original finish and performance records.

All legacy tools retain their public keys and input field types, enum values, requiredness and numeric schemas. Optional `raw` outputs preserve complete responses and pagination metadata. Nullable normalized fields remain null when the sport does not provide the equivalent metric; clocks and other values with incompatible units remain available in `raw`.

Three output fields in `search_leagues` are optional because the official responses can omit them: `leagues[].type` (NFL) and `leagues[].seasons[].year` plus `leagues[].seasons[].current` (Basketball). Their value types remain string, number and boolean. Actual split-year season strings are exposed separately as `season`; no year, league type or current-state value is invented.

Football, NBA and MMA have categories containing only their dedicated tools. Tools whose sport is selected at invocation, plus account/season discovery, remain uncategorized so that enabling a category does not implicitly enable every sport.

## Official sources

- [Football v3 reference](https://api-sports.io/documentation/football/v3) and [2026 provider guide](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide): all football resources, authentication, error envelopes, coverage and pagination.
- [NBA v2 reference](https://api-sports.io/documentation/nba/v2) and [2026 provider guide](https://www.api-football.com/news/post/how-to-get-started-with-api-nba-the-complete-beginners-guide): named leagues, nested game dates and scores, profile measurement objects, standings and statistics.
- [NFL v1 reference](https://api-sports.io/documentation/nfl/v1) and [2026 provider guide](https://www.api-football.com/news/post/how-to-get-started-with-api-nfl-the-complete-beginners-guide): current American Football host, supported resources, nested games, flat standings and optional league type.
- [Basketball release and response examples](https://www.api-football.com/news/post/api-basketball-new-release-available): split-year seasons, omitted year/current flags, coverage and player profiles.
- [Hockey v1](https://api-sports.io/documentation/hockey/v1), [Baseball v1](https://api-sports.io/documentation/baseball/v1), [MMA v1](https://api-sports.io/documentation/mma/v1): endpoint-specific filters, arrays, fight results and statistics.
- [2026 Volleyball provider guide](https://www.api-football.com/news/post/fivb-u17-volleyball-world-championships-2026-guide-to-using-data-with-api-sports): discovery, games, country objects and standings.

The provider's rendered references for AFL, Handball, Rugby, Volleyball and Formula 1 were not fully readable during the refresh. Their existing endpoints remain subject to provider error validation; no new Formula 1-specific resources were added. No provider calls, live E2E or evals were run. There are no file generation/download tools or webhook subscriptions in this package.
