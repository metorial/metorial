# IFTTT

Use the IFTTT Connect and Realtime APIs with an existing Platform service and provisioned connections. This integration reads service context and user configuration, discovers field options, performs queries, replaces complete connection configuration, and submits actions, test events or realtime notifications. Accepted requests do not prove downstream Applet completion.

## Authentication

**Service Key** uses the Platform Service Key from your service API settings. Setup verifies `/v2/me` and binds its actual service ID. User-specific operations additionally require your service's connected `userId`; this is not an IFTTT account ID. Connection definitions can be read without a connected user. Keys are static credentials; regenerate them in IFTTT and reconnect when needed.

**Webhooks Key (execution unavailable)** stores a Maker key separately without requiring a Platform Service Key. It has no documented identity endpoint and currently enables no callable webhook execution. `fire_webhook` refuses before any request because the required credential cannot be transmitted confidentially through this connection. Follow [IFTTT's Webhooks Documentation instructions](https://help.ifttt.com/hc/en-us/articles/115010230347-Webhooks-service-FAQ) to invoke an event directly using a trusted HTTP client. This also applies to an optional Webhooks key on Service Key authentication.

## Tools

| Tool key | Outcome |
| --- | --- |
| `get_current_context` | Read actual service ID, authentication level, and connected login when a user is supplied. |
| `get_connection` | Read the exact connection definition and native user status/configuration. |
| `get_field_options` | Read one field's options from native trigger/action/query/feature options; connected user required. |
| `perform_query` | Read native list results or query ingredients; preserve continuation cursor and fields. |
| `update_connection` | Replace the entire `user_features` configuration and read the current native configuration back. Omitted features/settings are removed. |
| `run_action` | Submit an action for the connected user; acceptance does not establish completed external effects. |
| `test_trigger` | Submit a test event that may deliver to the connection's webhook receiver. |
| `send_realtime_notification` | Request polling for specified users/trigger identities; this does not contain event data or a delivery receipt. |
| `fire_webhook` | Retained compatibility entry that refuses before dispatch while confidential execution is unavailable. |

For pagination, pass `nextCursor` and `nextFields` from a list response to the next query call. A continuation object without a usable cursor is rejected instead of implying a complete result. The API's query ingredient response is preserved as `items` when the native type is `query`. An omitted `limit` uses the provider's behavior; positive integer limits are validated without imposing an undocumented default or maximum.

## Limits

The APIs expose no general connection/Applet inventory or creation endpoint used by this integration. Provision connections and dynamic fields in the IFTTT Platform. There is no OAuth flow, Applet creation, runtime-script administration, subscription registration, arbitrary outbound URL, or rollback tool here. Actions and events can have irreversible external effects. Recheck the exact target after a timeout or failed receipt before retrying. Configuration readback describes current state; it does not prove every requested setting or external effect succeeded.

[IFTTT Webhooks](https://help.ifttt.com/hc/en-us/articles/115010230347-Webhooks-service-FAQ) requires Pro or higher; its queries require Pro+. Platform service publishing requires the appropriate partner access. See [Connect API](https://ifttt.com/docs/connect_api) and [Realtime API](https://ifttt.com/docs/api_reference) for provider prerequisites.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
