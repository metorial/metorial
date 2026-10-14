# LiveSession integration

LiveSession provides session replay and product analytics. This integration exposes 17 tools for sessions, websites, alerts, webhook destinations, funnels, and event metrics.

## Authentication

Use a Personal Access Token created in Settings > API Tokens. Requests use `Authorization: Bearer <token>`. Select the website and scopes needed for the workflow when creating the token. There is no required connection configuration or OAuth refresh flow for this authentication method.

The [authentication guide](https://livesession.dev/docs/api/authentication) documents token setup and the default per-token rate limit of two requests per second. Available [scopes](https://livesession.dev/docs/api/access-scopes) include `users.sessions:read`, `websites:read/write`, `alerts:read/write`, `webhooks:read/write`, `funnels:read/write`, and `metrics:read/write`.

## Tools

| Tool keys | Behavior |
| --- | --- |
| `list_sessions` | Filter sessions by email, visitor, and date range; paginate from page 0 with up to 100 results per page. Returns replay URLs and session/visitor metadata. Existing timestamp outputs remain strings containing the provider timestamp, and visitor parameters remain a name/value record. |
| `list_websites`, `create_website` | Discover stable website IDs and hostnames, or create a website. |
| `list_alerts`, `create_alert`, `update_alert`, `delete_alert` | Manage session-event alerts and Slack or webhook notification destinations. Creation requires the destination matching the selected provider. |
| `list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook` | Manage webhook destinations. Updates send the website ID, URL, and API version. Omitted website/URL values are resolved from the current webhook and require `webhooks:read`. |
| `create_funnel`, `update_funnel`, `delete_funnel`, `set_funnel_favourite`, `compute_funnel` | Manage conversion funnels and compute session, visitor, and event counts. Existing nested filter lists and custom-property aliases are translated to documented GraphQL inputs. Funnel creation/update compute arrays accept one configuration. |
| `compute_metric` | Compute sessions containing an exact custom-event name over a date range, using histogram aggregation. The documented defaults are `sum` and `week`. Returns the full provider response. |

Call `list_websites` before tools that need a website ID. REST relative dates include `TODAY`, `YESTERDAY`, `TODAY-7DAYS`, and `TODAY-30DAYS`; the GraphQL reference uses `TODAY_MINUS_7_DAYS` and `TODAY_MINUS_30_DAYS`.

## Provider documentation limitations

The current official GraphQL schema describes `updateFunnel(funnel_id: ID!): Boolean!`, while the existing tool sends its configuration as `input: FunnelInput!` and expects a funnel object. The configuration fields and operation are retained for compatibility, and provider errors are reported explicitly; the documented signature cannot perform the advertised configuration update. Provider confirmation is required to establish the legacy operation's availability.

The webhook update reference requires `url`, `website_id`, and `version` in the request body, with version also in the query. It does not document the existing `enabled` input. That input is retained and forwarded, but changing enabled state is not confirmed by the public contract.

The published GraphQL reference contains no identity endpoint or funnel list/get query, so no such operation is invented. Metric documentation demonstrates a request but does not define a response schema or enumerate all histogram options. The metric tool returns the provider response without assuming undocumented response fields.

## Sources

- [REST API reference](https://livesession.dev/docs/api/rest/get-sessions)
- [Official REST OpenAPI](https://github.com/livesession/livesession-docs/blob/master/api/rest/openapi.yaml)
- [Official GraphQL schema](https://github.com/livesession/livesession-docs/blob/master/api/graphql/schema.graphql)
- [Metrics computation](https://livesession.dev/docs/capabilities/metrics)
