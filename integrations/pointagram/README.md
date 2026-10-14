# Pointagram

Manage Pointagram players, teams, scores, and competition data. Create, search, retrieve, update, and remove players; create teams and inspect or change membership; add points with tags, comments, backdating, and source-score deduplication; discover score series and point types; and retrieve filtered score history and competition participants.

Authenticate with a Pointagram API key and the login email used to generate it in Settings → Integrations → Custom Integration. Existing operations use the documented legacy Custom Integration API; player retrieval and updates, team-member listing, and competition-participant retrieval use Custom API 2.0 with the same credentials.

Call `list_players`, `list_teams`, and `list_score_series` to discover identifiers before updating resources or adding scores. Team icon filenames include `Bears.png`, `Bulls.png`, `Cobras.png`, `Lions.png`, `Raccons.png`, `Sharks.png`, and `Tigers.png`; custom icons must first be uploaded in Pointagram.

Player removal is a soft-deletion request. Pointagram ignores removal of administrators, and full anonymization requires the Pointagram UI. Inspect the returned result and use `list_players` to confirm the outcome.

API references: [Legacy Custom Integration](https://www.pointagram.com/custom-integration-gamification/) and [Custom API 2.0](https://www.pointagram.com/custom-api-2-0-gamification/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
