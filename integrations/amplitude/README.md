# Amplitude

Track events, query analytics, download exports, and manage project data through Amplitude REST APIs. The integration has 35 tools spanning project-key Analytics APIs, OAuth Developer APIs, and Experiment Management APIs.

## Connections

- **API Key + Secret Key** (`api_key_secret`): existing project-scoped Analytics, ingestion, taxonomy, cohorts, annotations, privacy, and export tools. Choose US or EU once. Optionally add an **Experiment management API key** for experiment configuration, flags, deployments, and experiment search; deployment keys and project keys cannot replace it.
- **Amplitude OAuth** (`oauth`): ordinary authorization-code OAuth with PKCE and token refresh through Amplitude's regional authentication server. Configure your registered client ID and its issued secret, if any. Public clients use PKCE without a secret. The registered callback must match the connection callback exactly.

OAuth tools call `developer-api.amplitude.com` (US) or `developer-api.eu.amplitude.com` (EU) directly. There is no hosted MCP connection, MCP SDK, or protocol fallback. Amplitude's registered-client scope is still named `mcp:read`; Amplitude maps this legacy scope to Developer API read permissions. The scope name does not change the REST transport. `offline_access` enables refresh. No write scope is requested for the current read-only OAuth tools.

Project-key tools already know their project and do not require OAuth context discovery. OAuth tokens do not authorize the legacy project-key or Experiment Management APIs.

## Added REST tools

| Tool | Supported behavior |
| --- | --- |
| `get_amplitude_context` | Authenticated user/organization, paginated accessible projects, and optional selected-project metadata |
| `get_amplitude_charts` | List/search saved charts or read one, optionally including its read-only definition |
| `query_amplitude_data` | Execute a saved segmentation, sessions, funnel, or retention chart with optional result-size overrides; see the date-override limitation below |
| `get_flags` | List or read feature flag configuration using OAuth or an Experiment management key |
| `manage_amp_events` | Read-only list/search/get for raw tracking-plan events; project-key reads optionally include visible-event usage |
| `get_properties` | List or read event, user, or group property definitions; group properties require project keys |
| `search` | Search charts, events, event/user/group properties, flags, experiments, or cohorts using the required connection |
| `get_experiments` | List or read experiment configuration using the management key |
| `get_deployments` | List Experiment deployments using the management key, optionally filtered by project |

| `query_experiment` | Compare explicitly configured exposure-to-outcome funnels for control and treatment using project keys |
| `create_dashboard_report` | Download an HTML report combining saved-chart results through OAuth |
| `create_notebook_report` | Download an HTML report combining your narrative and saved-chart results through OAuth |
| `check_chart_threshold` | Evaluate an explicit saved-chart value against a threshold on demand through OAuth |

Use `get_amplitude_context` to obtain OAuth project IDs. List pages expose `pagination.next_cursor` and `has_more`. Chart searches stop at 10,000 matching records; narrow large searches with a name query or chart type. For event properties, obtain the exact event name with `manage_amp_events` first.

`query_amplitude_data` reads an existing saved chart. It does not author a new chart, create edit IDs, or persist changes. `get_chart_results` remains the project-key tool for downloadable saved-chart CSV. Never sum daily unique-user counts to produce a unique-user total across the entire period.

Date-override limitation: Amplitude currently rejects the documented `timeRange` input for a tested saved segmentation chart, returning HTTP 502 with an upstream HTTP 400 detail. The same chart succeeds without a date override and with the tested timezone, scalar, and result-size options. This does not establish that every chart is affected. Omitting `timeRange` uses the saved chart range; a failed request for specific dates is reported, not silently retried for a different period.

## Conversion analysis and reports

`query_experiment` requires exact exposure event, flag and variant property names, variant values, outcome event, date range, and conversion window. It queries two independent ordered funnels and uses whole-range unique-user totals. Users exposed to both variants may appear in both groups. Output includes conversion rates and absolute/relative lift; undefined rates are null. Each variant preserves the provider computation time and cache state when available. Recently ingested events may be absent from cached results. Native experiment attribution, metric configuration, statistical significance, and causal conclusions are outside this comparison.

Reports contain escaped narrative, saved-chart values, source links, query provenance, and truncation warnings. They are downloadable HTML files. Threshold checks request complete buckets and evaluate a caller-selected value at invocation time. Select the series and point index from `query_amplitude_data` with `excludeIncompleteDatapoints: true` and matching query options. Unconfirmed completeness produces an inconclusive result. Neither report tool creates a native Amplitude content object, and threshold checks do not create alert subscriptions or schedule work.

For project-key discovery, omit `projectId`: the connected key determines the Analytics project. OAuth requires an accessible project ID. Group-property reads accept `groupType`, or omit it for shared properties. Search supports charts via OAuth; events and event/user properties via either connection; cohorts and group properties via project keys; flags via OAuth or the management key; experiments via the management key. Local lists are capped at 10,000 records. Locally filtered provider pages can be empty while `has_more` remains true; follow `next_cursor` until completion. Deployment filtering retains the upstream numeric cursor and can similarly yield an empty page.

## Requested native capabilities still unavailable

These native operations have no verified REST implementation in the current integration:

- `render_amplitude_chart`
- `save_chart_edits`
- `rename_chart`
- Native experiment statistics and attribution
- `use_amplitude_chart_monitors`
- `use_amp_dashboards`
- `use_amp_notebooks`

The conversion comparison, reports, and threshold check provide explicit REST-backed alternatives for part of this work. Native content management and monitoring parity remains incomplete.

## Existing tools

The original names and compatible inputs are retained: `track_events`, `identify_user`, `query_active_users`, `query_event_segmentation`, `query_funnel`, `query_retention`, `query_sessions`, `query_user_composition`, `export_events`, `get_user_profile`, `get_chart_results`, `manage_cohorts`, `manage_taxonomy`, `manage_annotations`, and `delete_user_data`. User profile lookup is unavailable for EU residency and may require account entitlement.

Exports and chart CSVs are downloadable files, not inline encoded content. Upstream errors include useful provider details. Credentials are region-bound and not forwarded across redirects.

Sources: [official Developer API contract](https://github.com/amplitude/developer-cli/blob/main/openapi/bundled/openapi.bundled.json), [official OAuth implementation](https://github.com/amplitude/wizard/blob/main/src/utils/oauth.ts), [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api), and [Analytics API documentation](https://amplitude.com/docs/apis/analytics).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

## User activity, recordings, and revenue

Seven project-key tools bring the total to 35. All use the existing API Key + Secret Key connection and its US/EU region; the key already identifies the project.

| Tool | Behavior and continuation |
| --- | --- |
| `search_users` | Search by user ID, device ID, Amplitude ID, or user ID prefix; returns safe integer Amplitude IDs and the provider match type. No arbitrary property search. |
| `get_user_activity` | User summary and ordered events; defaults to the latest 100 events, accepts up to 1000. Complete sessions can make a page larger. Advance by `nextOffset`, which uses the actual returned count; an empty page ends traversal. |
| `list_session_replays` | Replay metadata with optional ISO time range, Amplitude ID, or up to 100 explicit replay IDs. Defaults to 50 results; maximum 200. Keep sort order and filters stable with `nextCursor`. Explicit replay IDs cannot be combined with an Amplitude ID or cursor. |
| `export_session_replay` | One ordered page of version 3 gzip rrweb JSON chunks and a downloadable JSON manifest. Defaults to 10 chunks; maximum 100. Follow `nextCursor` until `hasMore` is false and retain previous pages. `pageComplete` confirms every file on this page downloaded; `replayComplete` is true only when this invocation contains the whole recording. |
| `export_cohort_members` | Supply a cohort ID to start or a request ID to resume. Polls every two seconds within a 20-second deadline. Pending results retain the request ID; resume without creating another export. Completed results include the membership file. |
| `query_revenue_ltv` | Observed ARPU, ARPPU, total revenue, or paying users by acquisition cohort, with day-since-acquisition `rNd` values and provider counts/nulls. Dates are YYYYMMDD; intervals are 1, 7, or 30. |
| `query_realtime_users` | Today's and yesterday's active-user series in five-minute buckets, with original labels and nulls. These are not concurrent connection counts. |

`query_sessions` additionally supports `average_length` in seconds. Its optional `histogram` object applies only to `length_distribution`: choose `hours`, `minutes`, or `seconds`, nonnegative `min`, a larger `max`, and optionally positive `size`.

Replay and cohort exports have a 32 MiB aggregate download limit per invocation and a 30-second timeout per download request. Oversized exports fail explicitly; lower the replay page limit, or export a smaller cohort/fewer properties. Replay chunks stay gzip-compressed and are delivered in manifest order. Playback and video transcoding are outside scope.

For cohort starts, `includeProperties` defaults to false. `propertyKeys` implies property inclusion unless explicitly contradicted by `includeProperties: false`. Neither option can alter an existing request. Completed cohort requests remain downloadable for seven days. The tool follows only provider-issued HTTPS S3 download links without forwarding credentials, and refreshes an expired link once. A pending resume can return a null cohort ID when the status request reaches its deadline before identifying the cohort. Cohort exports may require entitlement and consume provider quota.

Sources: [Dashboard REST API](https://amplitude.com/docs/apis/analytics/dashboard-rest), [Session Replay API](https://amplitude.com/docs/apis/analytics/session-replay), [Behavioral Cohorts API](https://amplitude.com/docs/apis/analytics/behavioral-cohorts).
