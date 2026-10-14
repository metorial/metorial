# Pointagram integration

Pointagram is a gamification platform for players, teams, points, score series, and competitions. This integration exposes 13 tools for managing players and teams, awarding points, and retrieving competition and score data.

## Authentication

The API key and Pointagram login email are generated or selected under Settings → Integrations → Custom Integration. Credential verification uses the documented POST `/test` endpoint, with no request body. Legacy requests use `api_key` and `api_user` headers; Custom API 2.0 uses `Api-Key` and `Api-User`. Both use `Content-Type: application/json`. API keys have no documented OAuth exchange or refresh flow. Configuration has no duplicate authentication fields or required resource identifiers.

## API coverage

| Tool | Method and endpoint |
| --- | --- |
| `create_player` | POST `/create_player` |
| `list_players` | GET `/list_players`, optional `search_by` and `filter` |
| `remove_player` | POST `/remove_player` |
| `create_team` | POST `/add_team` |
| `list_teams` | GET `/list_teams` |
| `manage_team_membership` | POST `/add_to_team` or DELETE `/remove_from_team` |
| `add_score` | POST `/add_score` |
| `list_score_series` | GET `/list_score_series`, optional GET `/list_score_series_point_types` |
| `list_score_history` | GET `/list_score_series_history` |
| `list_competitions` | GET `/list_competitions`; optional API 2.0 GET `/competitions/{id}/players` for each selected competition |
| `get_player` | API 2.0 GET `/players/{id}` |
| `update_player` | API 2.0 POST `/players/{id}` |
| `list_team_players` | API 2.0 GET `/teams/{id}/players` |

Legacy endpoints use `https://app.pointagram.com/server/externalapi.php`; API 2.0 uses `https://app.pointagram.com/api/20`.

Player and team identifiers can be discovered using the list tools. Team membership accepts a player ID, email, or external ID. A name-only request first searches players and requires a unique exact match. Legacy documentation lists both `teamid` and `team_id`, so both documented spellings carry the same identifier. Membership removal sends a DELETE request with a JSON body.

Scores require a player identity, a score series ID or name, and numeric points or a point-type name. Numeric points retain support for decimals and zero. `sourceScoreId` causes the provider to revoke the previous matching transaction and create a replacement; this is provider-side deduplication rather than a no-op on repeated requests.

History supports JSON-string tag and OR-tag filters, JSON arrays of team/player IDs, UTC time bounds, revoked entries, and page sizes from 1 to 1000. Legacy pagination uses both the final row's timestamp and ID. List outputs preserve provider rows and support arrays as well as named arrays in response envelopes.

Competition player filters are sent as `search_by` and `filter`; access keys use `accesskey`. When several player identifiers are provided, email takes precedence, then name, then external ID. The participant option retrieves each selected competition's players using its ID and returns one combined list; player filters select competitions rather than limiting their participant lists.

## Limits

Player removal is soft deletion. Missing players can produce an HTTP-success error response, and administrator removal is ignored. Full anonymization requires the Pointagram UI. Inspect the API result and list players to confirm removal.

The documented endpoint inventory does not expose a dedicated current-user/account profile endpoint. Authentication retains the configured login email as the connection profile. None of these tools generates or downloads a file. Profile icon URLs are resource metadata.

This integration does not expose badge, quest, reward-store, point-type creation, embed-generation, or trigger capabilities. Provider acceptance of requests and response formats requires live verification.

## Official references

- [Legacy Custom Integration API](https://www.pointagram.com/custom-integration-gamification/)
- [Custom API 2.0](https://www.pointagram.com/custom-api-2-0-gamification/)
- [Official Swagger UI](https://www.pointagram.com/wp-content/swagger-ui/index.html)
- [OpenAPI 1.0.1](https://www.pointagram.com/wp-content/uploads/2025/02/openapi.yaml)
- [Developers overview](https://www.pointagram.com/gamification-api-for-developers/)
