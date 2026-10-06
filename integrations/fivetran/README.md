# Fivetran

Manage Fivetran groups, connections, destinations, schema selection, users, teams, transformations and webhook subscriptions. Discover account identity, connector configuration requirements and current role names before provisioning resources or assigning access.

Authenticate with a scoped or system API key and secret. Access follows the key's permissions. `get_account` identifies the authenticating account and, when applicable, its user or system key. `get_user` without an ID works only for a user-oriented key; system keys require an explicit user ID discovered with `list_users`.

The 45 tools retain all 42 established keys. Lists follow provider cursors and fail on incomplete or non-advancing pagination. Connection status comes from the provider's nested status object. Stored source/destination credentials, webhook signing secrets and arbitrary setup-test diagnostics are omitted from results.

Connections may be created paused with manual scheduling. Incremental sync, forced rescheduling and historical re-sync are distinct options. Starting or resuming a pipeline can ingest data and incur costs. Deleting a connection removes its configuration; data already written to a destination is retained. Destination/group removal must be planned around their associated resources.

Transformation configuration uses current dbt Core or Quickstart formats. dbt Core configuration contains `project_id`, `name` and `steps`; Quickstart configuration uses a package and connection dependencies. `type` is optional when the configuration identifies it unambiguously. Legacy dbt Cloud or Coalesce payloads are not accepted by this endpoint. Native schedules use INTEGRATED, INTERVAL, CRON or TIME_OF_DAY; lowercase historical values are normalized. Transformations can execute warehouse commands and incur costs.

Webhook subscriptions may be account- or group-scoped. Inactive subscriptions can be inspected and edited before enabling notification delivery. No automatic event subscriptions are provided by this integration.

[Official API documentation](https://fivetran.com/docs/developer-resources/rest-api/api-reference)

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
