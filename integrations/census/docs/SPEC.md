# Census / Fivetran Activations API coverage

Census is now Fivetran Activations. The current Workspace V1 APIs use bearer workspace keys at `https://app.getcensus.com/api/v1` or `https://app-eu.getcensus.com/api/v1`. Organization V1 APIs use Activations personal tokens. V2 source APIs are in public preview; this integration preserves the existing Workspace V1 contracts during the documented transition.

| Tools | Documented V1 route / behavior |
| --- | --- |
| get_workspace | GET /workspace, authenticated workspace identity |
| list_workspaces | GET /workspaces, personal-token organization discovery |
| list_syncs / get_sync | GET /syncs and /syncs/{id} |
| create_sync | POST /syncs, 201 created with data.sync_id, followed by GET readback |
| update_sync | PATCH /syncs/{id}, 200 updated; nested schedule updates require full read/merge |
| trigger_sync | POST /syncs/{id}/trigger with optional force_full_sync query parameter |
| delete_sync | DELETE /syncs/{id}, 200 deleted |
| get_sync_runs | GET /syncs/{id}/sync_runs or /sync_runs/{id}; optional parent guard |
| cancel_sync_run | POST /sync_runs/{id}/cancel, 200 cancelled; active runs only |
| list_connections | GET /sources and /destinations; safe metadata only |
| list_source_objects | GET /sources/{id}/objects; table/model/segment discovery |
| list_destination_objects | GET /destinations/{id}/objects; field full names and operation requirements |
| list_datasets | GET /datasets; SQL metadata with source ID and column data types |
| manage_webhook / list_webhooks | POST/GET /webhooks; GET/PATCH/DELETE /webhooks/{id}; no signing secret output |
| get_dataset_record | Historical GET /entities and /entities/{id}/record?record_id=…; not in the current reference, retained with explicit uncertainty |

Personal-token workspace calls require explicit workspaceId from list_workspaces. The read-only GET /workspaces/{workspaceId}/api_key requires organization-admin or workspace-owner permission; the resolved key is used privately, and its authenticated workspace ID is checked before proceeding. No key is rotated or created.

All public tool input schemas are objects. Existing eleven tool keys and input field meanings remain available. Optional discovery, paging and notification controls are additive. get_sync retains native source object IDs and table catalog/schema/name when supplied; it does not invent a source connection ID for model-backed responses. Provider-absent fields are optional, timestamps may be null, totals are provider-reported, and returnedCount is response-local. Unknown response shapes or unconfirmed success envelopes fail explicitly. Requests use a fixed region origin, a 30-second timeout, no redirects and no automatic mutation retries. Error responses never include raw provider bodies or credential-bearing parent errors.

Files are not produced or uploaded by these tools. Legacy triggers have no registrations and no replacement groups.

Reference: [current API](https://fivetran.com/docs/activations/rest-api/api-reference/introduction), [pagination](https://fivetran.com/docs/activations/rest-api/api-reference/introduction/pagination), [lifecycle](https://fivetran.com/docs/activations/census-migration-faq).
