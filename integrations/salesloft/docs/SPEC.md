# Salesloft API coverage

This integration uses the current public v2 REST API at `https://api.salesloft.com/v2`. Its 29 tools cover people/account CRUD and discovery, note CRUD and discovery, cadence discovery and membership lifecycle, email/call activity reading, completed external call logging, task/template reading, and current-user/team-user discovery. No triggers or webhook setup are registered.

## Authentication

The two supported methods are OAuth authorization code with refresh and customer API keys, both using Bearer requests. OAuth authorization and token exchange use `https://accounts.salesloft.com/oauth/authorize` and `/oauth/token`. Returned token expiry is respected, rotating refresh tokens are saved, and omitted refresh tokens retain the preceding token. Client credentials are a separate admin-enabled private-app provider capability and are not implemented here. Partner applications must use OAuth.

OAuth requests all scopes necessary for this tool surface: people/accounts/cadences/notes read, write and delete; calls read/write; emails read; email_contents read; tasks read; and team read. Delete scopes are distinct from write scopes. A user's visibility, role, feature access and app approval still apply. Explicit email-subject requests require the privileged email content scope.

## API contracts

Responses are validated as `data` resources or `data` collections with `metadata.paging`. IDs remain numeric public fields and must be positive safe integers. Legacy scalar list filters map to documented provider array parameters. Membership and note association IDs are scalar. JSON writes are used where supported; cadence enrollment uses the documented query parameters. HTTP 204 confirms delete operations. Failures contain sanitized status and remediation, without raw transport parents, headers or token bodies.

Call logging uses `POST /activities/calls`, maps legacy `note` to `notes` and numeric `userId` through user lookup to `user_guid`. Returned call notes are fetched through their linked note; email counts and recipient IDs, template counts/owner/team-template relation, cadence counts and note association types use current provider fields. Note updates read back the note after PUT because the published update-response schema incorrectly describes a person.

Legacy task `currentUser` is implemented using current-user discovery and `user_id[]`. Legacy template title/subject prefixes combine documented broad `search` with per-page case-insensitive prefix filtering; paging stays provider paging. Do not stop on an empty filtered page with a next page. The optional old task `status` remains accepted in the output schema, but current provider responses supply `currentState` instead; completion is derived from that documented state.

## Effects and limitations

Cadence enrollment can produce outreach/tasks/CRM activity. Membership removal may retain history and does not establish that all queued work is gone. Call logging cannot be undone through a documented call DELETE route and may persist CRM history. Account/person/note deletes are potentially irreversible. The integration does not implement sending email, dialing, task execution, buyer signals, imports/exports, redaction or webhooks. It returns no downloadable files.

## Sources

- [API](https://developers.salesloft.com/docs/api/)
- [Request and response format](https://developers.salesloft.com/docs/platform/api-basics/request-response-format/)
- [Authentication](https://developers.salesloft.com/docs/platform/api-basics/oauth-authentication/)
- [API keys](https://developers.salesloft.com/docs/platform/api-basics/api-key-authentication/)
- [Scopes](https://developers.salesloft.com/docs/platform/api-basics/scopes/)
- [Paging](https://developers.salesloft.com/docs/platform/api-basics/filtering-paging-sorting/)
- [Calls](https://developers.salesloft.com/docs/api/activities-calls-create/)
- [Notes](https://developers.salesloft.com/docs/api/notes-index/)
- [Cadence memberships](https://developers.salesloft.com/docs/api/cadence-memberships-create/)
