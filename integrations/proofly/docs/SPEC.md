# Proofly integration

Proofly provides social proof widgets, campaign controls, notification statistics, and collected lead data.

## Authentication

Use an API key in the `X-Api-Key` header. The key is available on the [developers page](https://proofly.io/developers) when signed in. The base URL is `https://proofly.io/api`. The API can report failures through an `ok: false` envelope even when the HTTP request succeeds. Token connections do not use OAuth or refresh tokens; configuration has no additional fields.

## Tool surface

| Tool | Operation |
| --- | --- |
| `get_user_info` | Read `/user`: account identity, registration date, login count, impression usage, pixel key and debug flag. |
| `get_activity_logs` | Read `/activity`: activity type, timestamp and IP address. |
| `list_campaigns` | Read `/campaigns`: campaign IDs, names, domains, enabled state and creation timestamps. |
| `get_campaign_notifications` | Read `/campaign/{campaign_id}`: notification IDs, settings, enabled state, creation timestamps and statistics. |
| `get_notification` | Read `/notification/{notification_id}`: return the provider's notification details without imposing an undocumented response model. |
| `toggle_campaign` | Send `PUT /campaign/{campaign_id}` to invert campaign state. This is a toggle, so repeating a request can undo the previous result. |
| `get_notification_data` | Read `/data/{notification_id}`: captured input, visitor details, location and collection time. Original collected data is retained. |
| `create_conversion` | Retain `POST /notification/{notification_id}/conversion` for existing callers; the current official reference does not document this endpoint. Require an explicit `ok: true` acknowledgment. |

Start with `list_campaigns`, then call `get_campaign_notifications` for a selected campaign. Use the returned notification ID for notification details or captured data.

The [API reference](https://proofly.io/developers) documents `{ ok, status, data }` envelopes. The [REST API guide](https://proofly.io/helpdesk/proofly-rest-api) also lists single-notification retrieval and `POST /data/{notification_id}` lead ingestion. It does not publish the lead-ingestion request or response model, so that route is not used as a speculative replacement for conversion creation.

## Boundaries

No webhook trigger or registration lifecycle is exposed. [Incoming conversion webhooks](https://proofly.io/helpdesk/push-conversions-with-webhooks) use a notification-specific URL copied from its Data tab; the guide does not specify that URL's structure or a complete API registration contract. No file download or export endpoint is exposed by these tools.

Optional metrics remain absent when the provider does not return them. Missing resource IDs and malformed list responses fail with a structured error rather than becoming placeholder IDs or empty results. Existing tool keys and input/output field types are preserved.

Free accounts are documented as allowing ten API requests per minute. No automatic retry is added, particularly for campaign toggles or conversion writes. Runtime behavior requires a separate live verification pass.
