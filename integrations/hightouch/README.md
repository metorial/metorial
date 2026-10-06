# Hightouch

Manage sources, destinations, models and syncs in the workspace authorized by a Hightouch API key. Submit syncs and sequences, inspect run history, and remove models or sync configurations.

## Authentication

Create a workspace API key from Settings > API keys. Keys inherit their selected user group permissions, and their creator must retain the required workspace access. Read-only keys cannot create or change resources. The API URL is `https://api.hightouch.com/api/v1`; no workspace configuration ID is required.

## Tools

| Capability | Tools |
| --- | --- |
| Sources | `list_sources`, `get_source`, `create_source`, `update_source` |
| Destinations | `list_destinations`, `get_destination`, `create_destination`, `update_destination` |
| Models | `list_models`, `get_model`, `create_model`, `update_model`, `delete_model` |
| Sync configurations | `list_syncs`, `get_sync`, `create_sync`, `update_sync`, `delete_sync` |
| Execution and monitoring | `trigger_sync`, `trigger_sync_sequence`, `list_sync_runs`, `get_sync_sequence_run` |

Lists use limit/offset pagination and report whether another page exists. Resource IDs are exposed under the existing sourceId, destinationId, modelId, syncId and runId fields. The API has no suitable account/self endpoint and does not expose source/destination deletion or sequence management.

## Effects and returned data

Source/destination creation may validate external connections. Creating or updating a model can query its warehouse and incur charges; `skipColumnQuery` only skips the documented creation column query. Enabled scheduled syncs and on-demand sequences can modify destination data and incur charges. Use `disabled=true` and no schedule for pipeline setup; disabled suppresses scheduled runs but does not block manual/API/sequence triggers. `clearSchedule=true` removes a sync schedule. Accepted run IDs confirm submission; inspect run history or sequence status for completion.

Connection configuration is intentionally returned as an empty object for sources, destinations and syncs because provider-specific values can contain credentials. Model query definitions remain available. Run error text is replaced with a generic debugger reference. No warehouse row data, run error files or personalization queries are exported by these tools.

For dbt references, supply the numeric ID as a string in the existing `dbt.modelId` field. For visual models, supply `visual.parentId` as a numeric ID string and `visual.filter` as a JSON filter object encoded as a string. The existing visual label maps to the provider's primaryLabel.

Deleting a sync removes future execution configuration, without undoing previously delivered data. Models with dependent syncs must have those syncs removed first.

## References

- [API overview and key permissions](https://hightouch.com/docs/developer-tools/api-guide)
- [API reference](https://hightouch.com/docs/api-reference)
- [Run and scheduling concepts](https://hightouch.com/docs/syncs/overview)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
