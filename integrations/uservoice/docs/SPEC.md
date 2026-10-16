# UserVoice integration

Connect to the tenant-specific UserVoice Admin API at
`https://{subdomain}.uservoice.com/api/v2/admin` using a trusted API client's ID and
secret or an existing bearer token. The subdomain belongs to the credentials;
legacy stored config remains available for older connections.

Credential connections exchange `client_credentials` at `/api/v2/oauth/token`.
Token renewal repeats that exchange using the original saved credentials. Expiry
is retained only when the provider returns it. A revoked bearer token requires a
replacement token. See [authentication](https://help.uservoice.com/hc/en-us/articles/1500002236081-Getting-Started-with-the-Admin-API).

## Available workflows

- Suggestions: list, retrieve, create, update, and delete.
- Statuses: list available statuses, create an update, and read update history.
- Forums: list, create, and update.
- Supporters: list, add, and remove.
- Users: list and retrieve the connected user's profile; import external users
  with optional account data, subject to the account's plan permissions.
- Labels, categories, roadmap features, and NPS ratings: read collections.
- Internal notes: create and list.

Collection tools preserve provider pagination metadata and optional raw records.
Missing optional values are omitted; zero values, false flags, empty strings, and
provider nulls in raw records remain intact.

The current [official API reference](https://developer.uservoice.com/docs/api/v2/reference/)
does not list the existing forum-write, supporter-write, and direct suggestion-DELETE
routes. They are retained for compatibility; availability must be confirmed for the
connected account. No webhooks, uploads, public-comment writes, feature linking, or
team/account administration tools are registered.
