# Statuspage integration

Use a Statuspage API key from Avatar → API info. Requests use `Authorization: OAuth <key>` against `https://api.statuspage.io/v1`; credentials are sent in the header. API keys authorize management operations on accessible pages. The published management API has page discovery but no suitable current-user identity endpoint; connection labels identify an accessible page rather than a user.

`list_pages` discovers page IDs without a configured default. Set an optional connection default or pass `pageId` to each page-scoped call. A page's `url` field is its company website, not its hosted status-page address.

The integration exposes sixteen tools:

- Page discovery and settings: `list_pages`, `get_page`, `update_page`.
- Components and groups: `list_components`, `manage_component`, `manage_component_group`.
- Incidents: `list_incidents`, `get_incident`, `create_incident`, `update_incident`.
- Existing templates and postmortems: `list_incident_templates`, `manage_postmortem`.
- Subscribers: `list_subscribers`, `manage_subscriber`.
- System metrics: `manage_metric`, `submit_metric_data`.

The original fourteen tool keys and existing input/output types remain supported. New page overrides and workflow controls are optional. Scheduled creation supplies both timestamps and selects the provider's scheduled status. Historical creation requires a backfill date and cannot change component statuses. Postmortem text is saved as a draft before a separate publish call.

Creation of an email, SMS or webhook subscriber infers the provider's communication mode from its contact fields. Webhooks require both an email and endpoint; SMS requires a phone number and country. Slack, Teams and integration-partner creation require their respective product setup flows. Existing subscriber IDs can be inspected or unsubscribed. The current API offers quarantine reactivation, which is distinct from restoring an unsubscribed subscriber; the legacy resubscribe flag is retained and reports an unsupported-operation error. Unsubscription suppression is explicit. Confirmation suppression works only on paid pages and has no effect on trials.

Metric creation requires an existing provider ID from `manage_metric` with `action=list_providers`. Custom data uses a Self provider. New charts can be hidden with `display=false`; the documented metric update accepts name and provider metric identifier. Batch submission sends the provider's metric-ID-to-points mapping, checks its acknowledgement, and reports asynchronous acceptance. Timestamps are Unix seconds within the past 28 days and are rounded by the provider to 30-second intervals. Submit regularly for continuous charts.

List endpoints expose optional `limit` and `page`; use page sizes up to 100. Subscriber contact searches are capped at 100, while unsearched subscriber lists have no documented maximum. Subscriber pages begin at 0 and use the API's `limit` parameter. Other lists begin at 1. All-incidents search uses `q` and `limit`; unresolved/scheduled lists use `per_page` and cannot search text. Component, group, template and metric lists also use `per_page`.

The API allows approximately one request per second per key and can return HTTP 420 or 429 on throttling. No write is retried automatically. Failures identify authentication, permission, resource or request issues without echoing request credentials or provider error bodies.

Public status changes, incident reminders, postmortem publication, Twitter posts and subscription messages can affect external recipients. Use dedicated pages and authorized contacts for testing. No event trigger is registered by this integration.

Sources: [Statuspage management API](https://developer.statuspage.io/), [API types and private-page authentication](https://support.atlassian.com/statuspage/docs/what-are-the-different-apis-under-statuspage/), [subscriber counting and retained records](https://support.atlassian.com/statuspage/docs/how-are-subscribers-counted/).
