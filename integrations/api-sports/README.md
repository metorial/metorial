# <img src="logo.png" height="20"> API Sports

Retrieve sports schedules, results, standings, team information and available player data through the direct API-Sports service. Choose a default sport at connection setup or supply a supported sport on individual tools. Available resources and filters vary between the twelve sport APIs.

Use `search_leagues`, `search_teams` and `get_seasons` to discover identifiers before requesting fixtures or statistics. Basketball may use split-year season strings through `seasonName`. NBA uses named league variants from `get_nba_leagues`; use `nbaLeague` for NBA team/fixture queries and the dedicated NBA standings and statistics tools. Football tools include match details, predictions, injuries, transfers, coaches, squads and scoring leaders. MMA tools include fight results and fighter statistics.

The `raw` output retains the complete provider response, including sport-specific details, coverage and pagination. A supported endpoint can return no records when its competition or season lacks coverage. Live queries are supported by Football, NBA and NFL; the other APIs have different filter capabilities. The integration uses read-only requests and does not subscribe to push events.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
