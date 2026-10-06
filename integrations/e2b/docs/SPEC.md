# E2B Integration

## Authentication

Provide a project API key from the E2B dashboard. Requests use the `X-API-Key` header against `https://api.e2b.app`; no project ID is required in connection configuration. The API key endpoints do not expose a current-user/profile endpoint. Team discovery and API-key administration require a separate bearer credential and are outside this integration's authentication method.

## Supported tools

| Capability | Tools |
| --- | --- |
| Sandbox lifecycle | `create_sandbox`, `list_sandboxes`, `get_sandbox`, `kill_sandbox`, `pause_sandbox`, `resume_sandbox`, `set_sandbox_timeout` |
| Reusable snapshots | `create_snapshot`, `list_snapshots` |
| Template discovery and deletion | `list_templates`, `delete_template` |
| Lifecycle history | `get_lifecycle_events` |
| Webhook management | `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook` |
| Persistent volumes | `list_volumes`, `create_volume`, `delete_volume` |

Sandbox creation defaults to the `base` template. Pass environment variables, metadata, an optional timeout, auto-pause, and optional volume mounts by volume name and absolute sandbox path. Creation and resume read sandbox details so their outputs include actual timestamps and resource allocation. Sandbox and template lists use the current v2 endpoints and expose `nextToken` from the provider's `X-Next-Token` response header. Metadata filters use the provider's encoded query-string format. Page limits are 1–100.

Snapshots return `snapshotId` and `names`, including template tags. Supply `snapshotId` as `create_sandbox.templateId` to start another sandbox from the snapshot. The source sandbox ID is returned for creation and for a source-sandbox-filtered list. The API does not return snapshot creation timestamps or a separate template ID; legacy `createdAt` and `templateId` output fields remain empty for compatibility. Filter snapshot lists by `sandboxId` or `name`. The unsupported legacy source `templateId` filter returns a clear validation error.

Webhooks subscribe to `sandbox.lifecycle.created`, `.updated`, `.killed`, `.paused`, `.resumed`, and `.checkpointed`. Use a receiver you control and supply a signing secret to verify requests. If omitted, a secret is securely generated but is not returned. The integration manages provider webhook configurations; it does not expose event triggers. Webhook updates require at least one changed field.

Direct code execution, shell commands, filesystem transfer, desktop control, and template building are separate SDK workflows and are not exposed by this integration.

## Official references

- [API specification](https://github.com/e2b-dev/infra/blob/main/spec/openapi.yml)
- [Sandbox SDK](https://e2b.dev/docs/sdk-reference/js-sdk/v2.6.2/sandbox)
- [Lifecycle webhooks](https://e2b.dev/docs/sandbox/lifecycle-events-webhooks)
- [Lifecycle events API](https://e2b.dev/docs/sandbox/lifecycle-events)
