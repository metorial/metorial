# Amplitude REST Integration Specification

Version: `0.2.4`. All production requests use REST APIs. Hosted MCP transport, SDK dependency, connection type, and unpublished wrappers are removed. Original 15 project-key tool IDs and compatible inputs remain intact.

## Authentication and regional routing

`oauth` is an ordinary authorization-code flow with PKCE S256, registered client ID, optional issued secret, callback-state/redirect/region binding, and refresh-token preservation. US endpoints are `https://auth.amplitude.com/oauth2/auth` and `/oauth2/token`; EU uses `https://auth.eu.amplitude.com`. Authorization and token requests do not contain an MCP resource parameter. Public clients use `none`; confidential clients send their configured secret in the token form body.

The existing registered client permits `mcp:read` and `offline_access`. These are provider-defined legacy scope names; the Developer API maps them to granular read permissions. Granular replacement scopes were rejected for this client during discovery. Current OAuth tools are read-only, so no write scope is requested. The HTTP endpoints are `https://developer-api.amplitude.com` and `https://developer-api.eu.amplitude.com`, never a hosted MCP endpoint.

`api_key_secret` retains region, API key, and secret key. Legacy stored configuration region remains a fallback. An additive optional `experimentManagementKey` authorizes only the Experiment Management API with a separate Bearer header on `https://experiment.amplitude.com/api/1` or `https://experiment.eu.amplitude.com/api/1`. No third authentication method is introduced. Project keys, deployment keys, and OAuth tokens are not substituted for that management credential.

## Added tool mapping

| Public tool | REST endpoints / constraints |
| --- | --- |
| `get_amplitude_context` | `GET /v1/context` and `GET /v1/projects`, paginated projects and optional selected-project metadata via a bounded accessible-project lookup |
| `get_amplitude_charts` | `GET /v1/projects/{project_id}/charts` or `.../charts/{chart_id}`, optional `include_definition` for single read |
| `query_amplitude_data` | `POST .../charts/{chart_id}/query`; read-only saved chart execution, not ad-hoc authoring |
| `get_flags` | Developer `GET /v1/projects/{project_id}/flags` or individual read; management `/flags` or `/flags/{id}` with optional project validation |
| `manage_amp_events` | Developer event list/get, or project-key `/api/2/taxonomy/event`; optional visible usage from `/api/2/events/list` |
| `get_properties` | Developer event/user property list/get; project-key Taxonomy event/user/group-property list/get. Group `group_type` uses the documented GET form body |
| `search` | Provider `q` on Developer charts/events/event/user properties; bounded local filtering for Developer flags and project-key events/properties/cohorts or management flags/experiments |
| `get_experiments` | Management API `GET /experiments` or `/experiments/{id}`; configuration only |
| `get_deployments` | Management API `GET /deployments`, optional local project filter preserving numeric nextCursor |
| `query_experiment` | Project-key Analytics `/api/2/funnels`, two independent exposure-filtered ordered funnels; whole-range `cumulativeRaw` counts |
| `create_dashboard_report` | Bounded saved-chart queries assembled into a downloadable HTML report |
| `create_notebook_report` | Bounded saved-chart queries and caller narrative assembled into a downloadable HTML report |
| `check_chart_threshold` | One saved-chart query and explicit value/comparator/threshold evaluation, stateless |

Developer list limits are 1–200 with opaque cursor strings and returned `pagination.next_cursor`/`has_more`. Chart search is capped at 10,000 matching index entries. Management API lists accept limits up to 1000 and numeric offsets. Returned provider objects are preserved; no guessed field remapping or fabricated dates are applied.

Chart query supports saved segmentation, sessions, funnels, and retention. Optional overrides are `time_range`, `timezone`, `exclude_incomplete_datapoints`, `group_by_limit`, and `time_series_limit`. Definition authoring and filter/group-by overrides are not supported. For unique-user metrics, never derive whole-period uniques by summing interval counts, even if provider metadata incorrectly marks a result additive.

The documented `time_range: { start, end }` with ISO `YYYY-MM-DD` dates currently returns Developer API HTTP 502 with detail `Request failed with status code 400` for the tested saved segmentation chart. Default-range execution and the tested timezone, scalar, and result-size options succeed; this is not evidence that all charts reject date overrides. Omitting `timeRange` uses the saved chart range. The integration preserves the upstream error and never silently retries with changed or omitted dates; changing a user-requested period requires their direction.

## Composed analytics

Experiment comparison requires explicit flag key, exposure event/property names, variant keys, outcome event, dates and a conversion window. It reports denominators, converters, rates, absolute rate difference, and relative lift. Rates with zero denominators and relative lift with zero control rate are null. Per-variant cache metadata preserves `timeComputed`, `wasCached`, and `cacheFreshness`, or null when absent; cached results can predate ingestion. Whole-range unique funnel totals are validated; daily unique counts are never summed. Crossovers can occur in both independent funnels. Native experiment metric configuration, first-exposure attribution and statistical significance are outside this tool.

Reports use OAuth saved-chart query results and user narrative, escaping all dynamic HTML. Each report includes sources, query provenance, warnings and truncation state. A report failure preserves the upstream error. Threshold checks request `exclude_incomplete_datapoints: true`, require affirmative effective exclusion or point completeness, and use explicit series/point selection from a query with the same options; incomplete, absent or truncated results must never be treated as an ordinary false condition. Reports create downloadable files, and checks execute once without persisting or scheduling alerts.

New local discovery lists are capped at 10,000 records, sorted by stable identifiers, and return cursors bound to the inputs, credentials and identifier snapshot. Existing OAuth list cursors keep their native contract. Local filtering of a provider page preserves continuation even if no items match. Analytics project IDs are determined by project keys; specifying projectId on those paths is rejected. OAuth reads require projectId. Management projectId is a configuration filter.

## Unresolved requested native parity

The following unpublished hosted-only tools were removed from registration rather than left as stubs or false successes: `render_amplitude_chart`, `save_chart_edits`, `rename_chart`, `use_amplitude_chart_monitors`, `use_amp_dashboards`, and `use_amp_notebooks`.

The public Developer API contract has no corresponding content-write or experiment-analysis operations. Authenticated candidate chart PATCH/PUT/POST and render requests returned 404; the saved chart was confirmed unchanged. Legacy Experiment REST rejected OAuth and Basic credentials, requiring its dedicated management key instead. No browser cookie/session-token authentication is used.

Direct read probes observed questionable upstream chart timestamps and unique-user aggregation hints. They remain provider data, not a reason to invent corrected response values. Provider-specific issues and fixture/entitlement gaps are tracked in the private live E2E report.

## Verification

Schema regression tests cover every registered input as a top-level JSON Schema object. Private live E2E covers provider operations, pagination, authentication mismatch, and actual readback/cleanup. New OAuth consent, token exchange, and refresh must be verified through the normal CLI. EU account access and account entitlements remain separate verification requirements. Native content, monitoring, and experiment-statistics parity is not claimed.

## Official evidence

- [Developer API OpenAPI](https://github.com/amplitude/developer-cli/blob/main/openapi/bundled/openapi.bundled.json)
- [Official OAuth client implementation](https://github.com/amplitude/wizard/blob/main/src/utils/oauth.ts)
- [US issuer discovery](https://auth.amplitude.com/.well-known/openid-configuration)
- [EU issuer discovery](https://auth.eu.amplitude.com/.well-known/openid-configuration)
- [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api)
- [Taxonomy API](https://amplitude.com/docs/apis/analytics/taxonomy)


## Project-key activity and downloadable recordings

The integration registers 35 tools. Seven additions use project API key/secret Basic authentication at `https://amplitude.com/api` or `https://analytics.eu.amplitude.com/api`; none require a project ID or OAuth context.

| Tool | REST mapping |
| --- | --- |
| `search_users` | `/2/usersearch?user=...`; user/device/Amplitude ID or user ID prefix. Map response-level `type` to `matchType`, return each `user_id` and safe integer `amplitude_id`. Empty matches are normal. |
| `get_user_activity` | `/2/useractivity` with `user`, `offset`, `limit`, `direction`; defaults 0/100/latest, maximum requested count 1000. Preserve ordered events including extra complete-session events; next offset advances by actual count. Empty page yields null continuation. |
| `list_session_replays` | `/1/session-replays`; optional `start_time`, `end_time`, `amplitude_id`, repeated `replay_id`, `page_token`, `page_size`, `sort_order`. Default limit 50, maximum 200. At most 100 explicit IDs; cannot combine with Amplitude ID or cursor. Explicit IDs cause provider page size to be ignored. Keep sort order consistent across pages. |
| `export_session_replay` | `/1/session-replays/files` with `replay_id`, `version=3`, `page_token`, and `page_size`; default 10, tool cap 100 (provider cap 1000). Deliver every ordered gzip rrweb JSON chunk on the page and a JSON manifest. Return metadata and continuation without signed URLs. |
| `export_cohort_members` | Start `/5/cohorts/request/{cohortId}`, status `/5/cohorts/request-status/{requestId}`, download `/5/cohorts/request/{requestId}/file`. Exactly one start/resume ID. Poll every two seconds within a 20-second wall-clock deadline, including deadline-capped status/request timeouts. Preserve request and known cohort IDs on pending results; an unknown cohort ID is null when a resume status request times out. |
| `query_revenue_ltv` | `/2/revenue/ltv`, metric `arpu/arppu/total_revenue/paying_users` maps to `m=0/1/2/3`; daily/weekly/monthly intervals map to `i=1/7/30`. Reuse segment/group serialization. Preserve acquisition `dates`, `rNd`, `count`, `paid`, `total_amount`, labels, and nulls. |
| `query_realtime_users` | `/2/realtime` with no inputs; preserve today/yesterday series, labels, HH:mm buckets, and nulls. Five-minute active-user counts are not concurrent users. |

`query_sessions` keeps its existing output and adds `average_length` through `/2/sessions/average`, in seconds. Its optional length-distribution histogram maps unit/min/max/size to `timeHistogramConfigBinTimeUnit/Min/Max/Size`; validate min >= 0, max > min, size > 0, and reject histogram on other metrics.

New downloads use a shared focused downloader with a 32 MiB aggregate receive-time byte bound, a 30-second request deadline, disabled automatic redirects, and `decompress: false`. The replay manifest counts toward the bound. Only provider-issued HTTPS S3 storage URLs are accepted; storage requests use a fresh unauthenticated client. File transport errors do not expose presigned URLs. Content detection preserves gzip MIME and bytes. Replay failures never return a page with missing chunks; refresh the same files API page once on an expired storage link and require stable keys/continuation. Metadata names correspond to the ordered files described in the manifest. `pageComplete` confirms the requested page; `replayComplete` only confirms a whole recording delivered in one invocation.

Cohort `includeProperties` is resolved after validation, defaults false, and is implied by nonempty `propertyKeys`; explicit false plus keys is invalid. Both options are start-only. Keys serialize as repeated `propKeys`. Small cohort files can be direct responses; larger files use a documented 302 S3 redirect. A failed expired storage link is refreshed once via the same file endpoint, never a new export request. Requests last seven days; storage links last one minute. Cohort quotas and entitlements remain provider restrictions.

No report plotting, flag writes, native content CRUD, replay playback/transcoding, calendar revenue reinterpretation, or revenue forecasting is introduced.
