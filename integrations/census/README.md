# Census / Fivetran Activations

Manage warehouse-to-application data syncs through the supported Activations V1 API. Census is now part of Fivetran Activations. Existing workspaces and workspace keys remain available during the announced API transition; future V1 deprecation dates are not yet confirmed.

Use a workspace API key for its authenticated workspace. An Activations personal access token can discover workspaces with `list_workspaces`; pass an explicitly selected `workspaceId` to workspace tools. Organization administrators and workspace owners can retrieve the existing workspace key through the documented read-only API. Keys are never included in tool results. Activations tokens are distinct from core Fivetran credentials.

Choose `us` or `eu` when authenticating. Previously stored region configuration remains a fallback for existing connections. Older personal-token connections should authenticate again to persist their credential type before targeting a workspace.

The 17 tools cover workspace identity/discovery, sync creation/configuration/deletion, incremental or full run requests, run history/status/cancellation, connection lists, source/destination objects, SQL dataset metadata, and webhook management. List tools return one page by default; `allPages: true` follows documented numeric `next_page` values from the requested page. `returnedCount` describes only this response; totals appear only when reported by the provider. Webhook listing is not paginated in the current API reference.

Sync creation reads back the configuration after the provider returns its new ID. Existing flat scheduling inputs map to `mode.triggers.schedule`; partial schedule updates preserve the other schedule fields and trigger settings. Constant values and legacy dataset record keys keep their literal spelling. Connection credentials, webhook signing secrets and free-form run error messages are omitted from outputs.

Creating, scheduling, resuming or triggering a sync can query warehouses, transfer data, incur usage charges and notify workspace recipients. Mirror operations may delete destination records. Run acceptance and cancellation acceptance do not prove completion or stopping; use `get_sync_runs`. Deleting configuration does not reverse transferred data, notifications or costs.

`get_dataset_record` retains its historical `/entities` routes. Those routes are absent from the current published API reference, so availability requires workspace-specific confirmation. This is not evidence of provider shutdown. `list_datasets` uses the documented SQL metadata API and does not replace record lookup. The announced Census Store/CSV/Mesh sunset does not establish that all SQL datasets or legacy record-access APIs are retired.

Official documentation: [API introduction](https://fivetran.com/docs/activations/rest-api/api-reference/introduction), [migration FAQ](https://fivetran.com/docs/activations/census-migration-faq), [workspace key retrieval](https://fivetran.com/docs/activations/rest-api/api-reference/v1/organization-apis/workspaces/get-workspace-api-key).
