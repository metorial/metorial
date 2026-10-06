# UptimeRobot capability specification

The integration supports two explicitly selected connection types: legacy v2 account API keys submitted in form bodies, and current v3 account tokens sent as Bearer authorization headers. Existing connections without a stored version continue to use v2. Account identity validates each connection; account-level read-only credentials support reads, and write access is required for mutations.

| Workflow | Tools | API |
| --- | --- | --- |
| Identity and limits | `who_am_i` | v3 |
| Monitor discovery and settings | `list_current_monitors`, `get_monitor`, `manage_monitor` | v3 |
| Downtime investigation | `list_incidents` | v3 |
| Existing monitor workflows | `list_monitors`, `create_monitor`, `update_monitor`, `delete_monitor` | v2 |
| Account details | `get_account_details` | v2 |
| Notification recipients | `list_alert_contacts`, `create_alert_contact`, `delete_alert_contact` | v2 |
| Public status pages | `list_status_pages`, `create_status_page`, `delete_status_page` | v2 |
| Maintenance scheduling | `list_maintenance_windows`, `create_maintenance_window`, `delete_maintenance_window` | v2 |

All fourteen existing tool keys and field types remain available. The legacy SMS contact input remains accepted but returns a clear unsupported-operation error. Current create/update cover HTTP, keyword, ping, port, heartbeat and DNS types, with pause/start and permanent deletion. Changing monitor type is intentionally unsupported. Lists return the provider's actual pagination metadata; current cursors are extracted only from trusted provider pagination links.

Monitor outputs include monitoring state and settings, excluding credentials, request headers/bodies, API keys and heartbeat URLs. Credential-bearing alert-contact values are redacted, while email contacts retain their address. Status-page creation never silently includes all monitors. Errors preserve provider HTTP status, machine code and rate-limit/retry headers when available, without exposing request secrets. Mutations are never automatically retried.

No triggers are registered. No bulk/reset operations, incident changes, external notification tests or broader administrative features are included.

Sources: [current API](https://uptimerobot.com/api/v3/), [official OpenAPI](https://cdn.uptimerobot.com/api/openapi.yaml), [legacy API](https://uptimerobot.com/api/legacy/).
