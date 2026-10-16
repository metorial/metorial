# Rocketadmin integration

This integration exposes 17 tools for Rocketadmin's documented database-management API.

## Authentication and instance selection

- `api_key`: sends `x-api-key`, validates it with `GET /check/apikey`, and supports connection discovery and table data routes.
- `email_password`: obtains the `rocketadmin_cookie` session from `POST /user/login/`. Accounts with two-factor authentication can supply `otpToken`, which is submitted to `POST /user/otp/login/` using the temporary login cookie. The completed session's expiration is retained. Reconnect after expiration; the provider does not document a refresh-token endpoint.
- Both methods accept optional `instanceUrl`; the default API base is `https://app.rocketadmin.com/api`. Self-hosted configurations must include the API prefix (often `/api`) or point directly to the backend. Custom base paths are preserved; only the exact legacy cloud website root is normalized to its `/api` base. The authenticated instance is persisted with the credential. Existing stored connections can still use their legacy base URL, and legacy session tokens are recognized as JWTs.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_current_user` | Current user ID, email, and complete user response. Session authentication required. |
| `get_my_company` | Current company ID and complete company response. Session authentication required. |
| `list_connections` | Discover authorized connection IDs and normalized optional metadata, with the complete response retained. |
| `manage_connection` | Get, create, update, test, and delete connections. Update/test reuse available saved non-secret settings plus supplied overrides. Saved responses omit SSH username and private key, so callers must resupply `sshUsername` and `privateSSHKey` for SSH update/test operations. Missing fields fail before the update/test request. |
| `list_tables` | List tables or inspect a table's structure. |
| `get_rows` | Retrieve a single row by primary key, or query rows with operator-based filtering, search, sorting, and pagination. |
| `add_row` | Insert column values and retain the complete returned row envelope. |
| `update_row` | Update a single row or a batch of primary keys. Bulk results retain success without inventing an affected-row count. |
| `delete_row` | Delete a single row or a batch of primary keys. Single results retain the deleted-row response; bulk results retain the provider Boolean confirmation without claiming a count. |
| `export_csv` | Fetch the POST-only CSV export and provide a downloadable file. Existing CSV text output remains available for compatibility. |
| `manage_groups` | List/create/delete connection groups and add/remove/list group users. |
| `manage_company_users` | List, invite, remove, suspend, and unsuspend company users. Invitations require a role; hosted invitations also require a current `turnstileToken` issued by the interactive Rocketadmin invitation challenge. Self-hosted deployments may omit the token. Suspension resolves the selected user ID to the provider-required email. |
| `manage_dashboards` | List/get/create/update/delete dashboards. Connection ID scopes every action. |
| `manage_saved_queries` | List/get/create/update/delete/execute saved queries. Creation requires title, SQL text, and visualization type. |
| `manage_action_rules` | List/create/update/delete rules. List responses unwrap the provider's `action_rules` array while retaining legacy root-array support. Full configuration uses `table_actions` and `events`; supported row-event shorthand maps to provider event names. |
| `manage_table_settings` | Read/create/update/delete table display settings using connection and table query parameters. |
| `get_audit_logs` | Connection and sign-in logs with provider pagination. Existing user-ID filtering resolves IDs to email addresses; sign-in logs require/discover a company ID. |

All tool inputs are object schemas. Existing tool keys, field types, and input optionalness remain available. New fields are optional at the schema level, with action-specific requirements validated before the provider operation. Master passwords are passed only as connection-specific request headers. No triggers are registered.

Provider responses supply normalized identifiers and pagination; missing identifiers or malformed required response fields produce a service error. Row envelopes, complete query results, and additional response fields remain available. Bulk success is distinct from an affected-row count.

## Scope

CSV import, AI operations, secrets, branding, dashboard widgets, schema-change automation, and audit-log exports are outside this tool surface. Administrative operations require session authentication and provider permissions. API keys do not unlock session-only endpoints.

## Official references

- [API endpoint inventory](https://docs.rocketadmin.com/api-reference/rocketadmin)
- [Provider-maintained implementation](https://github.com/rocket-admin/rocketadmin/tree/903c7f4bbbbc2c8d39186cf7a653e816ad463dd6/backend/src/entities)
- [Session authentication middleware](https://github.com/rocket-admin/rocketadmin/blob/903c7f4bbbbc2c8d39186cf7a653e816ad463dd6/backend/src/authorization/auth.middleware.ts)
- [API key authentication middleware](https://github.com/rocket-admin/rocketadmin/blob/903c7f4bbbbc2c8d39186cf7a653e816ad463dd6/backend/src/authorization/auth-with-api.middleware.ts)

Verification for the October 2026 refresh is documentation-based and local. Live account behavior and downloadable file delivery have not been exercised.
