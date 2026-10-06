# Scale AI Integration

The integration targets the Scale annotation API at `https://api.scale.com/v1`. It does not target the separate GenAI v2 API.

## Authentication

Use an API key as the Basic authentication username with an empty password. Scale provides separate test and live keys; resources created in one mode cannot be referenced in the other. Live annotation task requests incur charges. No additional connection configuration is required.

Official reference: [Authentication](https://api-reference.scale.com/docs/api-reference/authentication).

## Capabilities

| Area | Tools and behavior |
| --- | --- |
| Projects | `create_project`, `get_project`, `list_projects`, `update_project`; default parameters and instructions, optional Studio consensus configuration. Discover names with `list_projects`. |
| Tasks | `create_task`, `get_task`, `list_tasks`, `cancel_task`, `update_task`; annotation payloads, metadata replacement, tag operations, deduplication ID updates/removal. |
| Batches | `create_batch`, `get_batch`, `list_batches`, `finalize_batch`; batch status and task counts, optional priority before finalization. |
| Team | `manage_team` lists teammates, invites members, or updates member roles. Invite and role updates require nonempty email addresses and a role. |
| Files | `import_file` imports a source URL and returns a Scale-hosted `scaledata://` reference for task creation. |
| Evaluation | `create_evaluation_task` creates known-answer quality tasks for Scale Rapid projects only. |
| Callbacks | `resend_callback` retries delivery for a completed or errored task to its configured receiver. Creation tools also accept provider callback destinations. |

Task type-specific parameters belong in `taskParams`. Explicit fields such as `project`, `instruction`, and `expectedResponse` take precedence over values in that parameter object. `update_project` follows the same precedence for explicit instructions and `patch`.

Task lists accept project/batch/status/type filters, tags, deduplication identifiers, review status, date windows, and optional temporary source-file URLs. Supply the returned `nextToken` to continue. `createdAfter` and `createdBefore` are sent as Scale's `start_time` and `end_time` filters.

Batch lists accept project/status/date filters, detailed progress, `limit`, and `offset`; use `nextOffset` when `hasMore` is true. `get_batch` requires both batch detail and status requests to succeed.

`update_task` rejects calls without an update. Use either `setTags` or incremental `addTags`/`removeTags`. Use either `uniqueId` or `clearUniqueId`. Metadata replaces the existing object; supply all keys you intend to keep.

Only pending tasks can be canceled. Repeated cancellation is idempotent. Rapid and Studio batches require finalization; Scale documents finalization as a no-op for other project types. The public reference does not expose project, batch, or imported-file deletion, so creation of these objects requires planning for their retention.

The legacy `update_project.ontology` input remains in the schema for compatibility but is unavailable. Supplying it fails before any update is made. Publish taxonomy changes in the Scale dashboard as described by the [Taxonomy service reference](https://api-reference.scale.com/docs/api-reference/taxonomy-service). Parameter updates use the documented `setParams` operation. Set `patch: true` to retain unspecified parameters; supplied arrays and objects replace their prior values. Omitting `patch` replaces all parameters.

## Events

No event triggers are exposed. Provider callbacks remain available through task and batch input fields. Scale documents the `scale-callback-auth` header for receivers that the customer manages; this integration does not receive those requests.

## Official sources

- [Projects](https://api-reference.scale.com/docs/api-reference/projects)
- [Tasks](https://api-reference.scale.com/docs/api-reference/tasks)
- [Batches](https://api-reference.scale.com/docs/api-reference/batches)
- [Callbacks](https://api-reference.scale.com/docs/api-reference/callbacks)
- [Taxonomy service](https://api-reference.scale.com/docs/api-reference/taxonomy-service)
- [Official Python SDK](https://github.com/scaleapi/scaleapi-python-client), including team management, imports, and Rapid evaluation tasks.
