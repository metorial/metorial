# Celigo

Manage integrator.io connections, flows, exports, imports and integration configurations. Discover native resources, inspect jobs and open errors, request flow runs or retries, administer account access, store keyed JSON state, and download current job files or diagnostic archives.

Use an API service token or personal access token issued in the US, EU, Australia or Canada region. Tokens also bind an environment, selected by Celigo rather than an environment header. Personal tokens inherit their user’s access; custom service-token capabilities may not permit configuration, job or error operations. Token context returns the provider’s native owner ID and does not infer token mode, environment, scopes or a human name. Tokens are manually rotated rather than automatically refreshed. New connections retain the selected or validated historical region; conflicting stored/auth regions are refused before sending a token.

Connection/flow/export/import/integration/account-access lists return one native page with a continuation URL when available. Keep the same filters and limit when continuing. Jobs use the provider’s date-boundary paging; pinned active jobs and equal timestamps prevent a promise of an exhaustive history.

Updates verify any explicitly requested writable name against the native receipt; other server defaults and read-only metadata remain native. Updates use full-replace PUT and require complete writable configuration plus `replaceAll: true`. Omitted credentials or settings may be cleared; masked connection credentials cannot safely be copied back. Flow enable/disable uses the documented JSON Patch operation. Clone requests accept `cloneOptions`: flow clones require `_integrationId` and `connectionMap`, and integration clones require `connectionMap`. Clones can create multiple resources and share existing connections.

`manage_users` operates on account access records. Use `accessRecordId` from their native `_id`; the legacy `userId` alias must resolve directly to that same access record. `sharedWithUser._id` and `_sharedWithUserId` identify the separate person and are never converted into an access-record ID. Invites use email(s) with documented access settings. Unsupported name, email-update, disabled or userType changes fail explicitly. Invitation results report per-recipient failures; accepted emails/access can remain after a partial failure.

State supports global keys or keys scoped to exports, imports or integrations. Provide both scope fields or neither. Flow error operations verify the processor belongs to the exact flow and verify supplied error IDs/retry keys before writing. Queued runs/retries are asynchronous; poll the returned job IDs. Resolving errors retains history and does not retry records. The undocumented legacy `get_job.includeErrors` path is refused with guidance to use `get_flow_errors` and its flow/job filters; this does not assert provider retirement.

Job downloads require an exact file ID discovered from `get_job`, or select the current diagnostic archive. Files can be unavailable or purged. Supported S3 Signature V4 links use their native expiry; renewal rechecks region, token owner, job binding and exact current file reference. Diagnostics identify the current archive rather than a historical snapshot. Unsupported storage hosts or signing formats require downloading through Celigo or the underlying storage provider.

Configuration deletes are soft and retain resources in the recycle bin for 30 days. Access removal is irreversible. State deletion, error resolution and cleanup do not undo jobs, external data changes, emails, copied dependencies or historical activity. Ambiguous write failures carry safe resource/name recovery context where available; do not blindly repeat creation, invitation or execution requests.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
