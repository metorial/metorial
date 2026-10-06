# Fivetran integration

## Authentication and account identity

Auth key `api_key_secret` retains input `apiKey`/`apiSecret` and encoded output `token`. Keys use HTTP Basic authentication over the fixed `https://api.fivetran.com/v1` origin. The current operation-level reference specifies `GET /account/info`; its higher-level account summary abbreviates the route as `/account`. This integration follows the operation definition.

The profile uses the actual account identity, supporting scoped and system keys. `get_account` returns account ID/name and the applicable user or system-key identifier. No unsupported `/users/me` endpoint is called. `get_user` without `userId` resolves `account.user_id` and then reads that exact user; a system key receives an actionable service error requesting an explicit ID. No global resource IDs or duplicated credentials are required in configuration.

## Tools and discovery

| Resource | Operations |
| --- | --- |
| Account | `get_account` |
| Groups | `list_groups`, `get_group`, `create_group`, `update_group`, `delete_group` |
| Connections | `list_connections`, `get_connection`, `create_connection`, `update_connection`, `delete_connection`, `trigger_sync` |
| Schema selection | `get_connection_schema`, `update_connection_schema`, `reload_connection_schema` |
| Destinations | `list_destinations`, `get_destination`, `create_destination`, `update_destination`, `delete_destination` |
| Users | `list_users`, `get_user`, `invite_user`, `update_user`, `delete_user` |
| Teams and roles | `list_teams`, `get_team`, `create_team`, `update_team`, `delete_team`, `manage_team_membership`, `list_roles` |
| Transformations | `list_transformations`, `get_transformation`, `create_transformation`, `update_transformation`, `delete_transformation`, `run_transformation` |
| Source metadata | `list_connector_types`, `get_connector_type` |
| Webhooks | `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook` |

Discover authorized IDs with the corresponding list operation. Resource ID schemas share those discovery instructions. Group expansion includes safely parsed connection/user collections. Team expansion returns documented membership rows with `user_id`, role and creation time. Current role discovery includes scope and deprecation/replacement metadata.

## API behavior and compatibility

All 42 original tool keys and existing input/output field types remain. Three additive reads expose account identity, current role names and webhook details. Input schemas serialize as top-level objects. Numeric `syncFrequency` remains a number; unsupported native frequencies fail at runtime. Optional fields that the provider requires for an operation remain optional in the public schema and receive actionable runtime validation, including destination creation timezone and invitation given/family names. Destination updates read and preserve the required timezone when omitted; `+0` normalizes to the provider's `0` spelling.

Connection and destination resource operations use the operation's versioned JSON Accept header; schema operations and group connection lists use plain JSON. Status fields map from `status.setup_state` and `status.sync_state`. Creation adds optional authorization and destination schema naming fields. Get/create/update outputs preserve the optional `config` contract but omit stored credential-bearing configuration. Setup-test results expose only enumerated statuses, excluding messages/details that may contain source credentials. Destination results use the same omission policy. Deleting a connection does not remove destination data.

Transformation `config` maps to provider `transformation_config`; optional `type` supports DBT_CORE or QUICKSTART and can be inferred from unambiguous config. Historical top-level `connectionIds` maps to the correct native schedule or Quickstart creation config. Lowercase schedule type values normalize to native uppercase. Updates merge the current schedule before applying partial fields and preserve omitted settings. Quickstart dependency replacement is unsupported by the published update config and receives an actionable service error. Legacy dbt Cloud/Coalesce config receives an actionable error instead of an invented endpoint. Output metadata includes type, paused state, name/project ID and all model names; `outputModelName` remains the first model when present. Arbitrary transformation commands/variables are not echoed.

Connector metadata converts supported feature objects to the established string identifier array and additionally returns feature notes and static configuration/authorization metadata. The established `configSchema` and `authorizationSchema` output names are retained; their objects describe provider configuration requirements and are not guaranteed to be JSON Schemas or stored credentials.

Manual sync and historical re-sync remain separate operations. A force sync addresses rescheduling and does not silently bypass pause state. Resync scope must map schema names to table-name arrays. Invitation, permissions, job execution and provisioning can have irreversible notifications or billing effects.

## Errors, responses and pagination

The client uses shared authenticated HTTP, payload and API error helpers. User validation and upstream failures throw service errors. The client validates documented 200/201 status codes, accepts empty 204 deletion responses, and checks success envelopes, response resource identity, required collection shapes and core state rather than claiming success on malformed responses. API error parents contain safe status information; raw request/response objects, authorization headers and provider payloads are omitted. Only a validated Retry-After header value is retained. Requests have a 30-second timeout and do not follow redirects or automatically retry uncertain writes.

Lists follow all `next_cursor` values with a 100-record page size. Empty pages with a next cursor, repeated cursors or a 1,000-page bound fail explicitly with incomplete-result errors. A failed page never becomes an empty list. Optional null cursor termination is accepted.

## Events and files

Webhook management configures provider subscriptions; signing secrets are never returned. Legacy integration triggers are absent, and no replacement subscriptions were introduced. No tool downloads or exports files. This package does not provide deployment agents, system-key management, private links, certificates, log-service management or transformation-project provisioning.

## Verification and limits

The private active E2E suite uses independent authenticated reads for provider assertions and exact owned-resource cleanup. Writes require an isolated test account with a matching account identifier and operation-specific permissions. Pipeline provisioning and jobs additionally require certified synthetic sources/destinations and explicit cost approval. Invitation delivery and transformation/ingestion effects are not claimed reversible. See the private suite's README for fixture requirements.

Provider permissions and service-specific configuration vary by account and connector. Read/merge/write operations can race other writers. Static schema checks and suite collection do not prove live acceptance.
