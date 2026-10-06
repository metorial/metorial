# Reporting API contract

The current Later Influence Reporting API is hosted at `https://reporting.api.later.com`. Its dedicated reference describes v2.0.0 using OpenAPI 3.1.1. The older Help Center migration article contains conflicting token-lifetime, numbered-pagination and date-basis examples; current implementation follows the dedicated reference and token `exp`, without assuming a fixed lifetime.

| Tool | Documented operation |
| --- | --- |
| list_instances | GET /v2/instances |
| list_campaigns_v2 | GET /v2/campaigns |
| get_analytics | GET /v2/instances/performance, /instances/performance-over-time, /campaigns/performance, /creators/performance, /platforms/performance, /platforms/return-on-investment or /posts/performance |
| get_instance | GET /v1/reporting-api/instance on api.mavrck.co |
| list_campaigns | GET /v1/reporting-api/campaign on api.mavrck.co |
| list_reporting_groups | GET /v1/reporting-api/reporting-group on api.mavrck.co |
| get_performance_report | GET /v1/reporting-api/report on api.mavrck.co |

Both credential methods exchange JSON `clientId` and `clientSecret` at their own host's POST /oauth/token. V2 requires the documented `jwt` field and a usable future JWT expiry. Legacy token aliases remain accepted. JWT decoding schedules renewal only; provider responses establish access and scope. Existing unmarked auth output stays v1. There is no suitable documented current-user endpoint: accessible instance IDs are discovery data, not human identity.

Current response envelopes contain `data` and nullable `nextCursor`; no totals are fabricated. Arrays use repeated query keys. The campaign roster accepts only pagination. Performance dates are required; metrics are required except for ROI. Summary rejects pagination; time series alone accepts granularity; only campaign, creator, platform and post accept sorting. Metric names and sorting fields are checked per route; additional platform/format restrictions remain authoritative provider validation. ROI's fixed numeric fields are returned within the common `metrics` object. Known identifiers and metric values are projected; unrequested creator profiles, image URLs and arbitrary response properties are omitted.

Legacy output field types and requiredness remain unchanged. Provider responses missing those fields fail explicitly rather than inventing empty identifiers or zeros. The migration article confirms legacy routes, but does not supply a current complete v1 response specification or definitive retirement date. V1 compatibility remains subject to real account verification; reporting groups have no inferred current replacement.

Upstream errors expose only validated HTTP status and recognized ANL code with fixed remediation text. Transport details, credentials, provider body text and original parent/cause objects are discarded. API redirects are disabled. Reporting rate limits are not automatically retried.

References: [API reference](https://docs.reporting.api.later.com/api-reference), [authentication](https://docs.reporting.api.later.com/authentication), [querying](https://docs.reporting.api.later.com/querying), [error contract](https://docs.reporting.api.later.com/errors), [migration](https://help-influence.later.com/hc/en-us/articles/20462385592087-Implement-the-Reporting-API-for-Later-Influence).
