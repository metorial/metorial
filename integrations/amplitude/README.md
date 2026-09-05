# Amplitude

Track events, query analytics, download exports, and manage project data through Amplitude REST APIs. The integration has 24 tools: the original 15 project-key tools, seven OAuth Developer API tools, and two Experiment Management API reads.

## Connections

- **API Key + Secret Key** (`api_key_secret`): existing project-scoped Analytics, ingestion, taxonomy, cohorts, annotations, privacy, and export tools. Choose US or EU once. Optionally add an **Experiment management API key** for experiment configuration and deployments; deployment keys and project keys cannot replace it.
- **Amplitude OAuth** (`oauth`): ordinary authorization-code OAuth with PKCE and token refresh through Amplitude's regional authentication server. Configure your registered client ID and its issued secret, if any. Public clients use PKCE without a secret. The registered callback must match the connection callback exactly.

OAuth tools call `developer-api.amplitude.com` (US) or `developer-api.eu.amplitude.com` (EU) directly. There is no hosted MCP connection, MCP SDK, or protocol fallback. Amplitude's registered-client scope is still named `mcp:read`; Amplitude maps this legacy scope to Developer API read permissions. The scope name does not change the REST transport. `offline_access` enables refresh. No write scope is requested for the current read-only OAuth tools.

Project-key tools already know their project and do not require OAuth context discovery. OAuth tokens do not authorize the legacy project-key or Experiment Management APIs.

## Added REST tools

| Tool | Supported behavior |
| --- | --- |
| `get_amplitude_context` | Authenticated user/organization plus paginated accessible projects |
| `get_amplitude_charts` | List/search saved charts or read one, optionally including its read-only definition |
| `query_amplitude_data` | Execute a saved segmentation, sessions, funnel, or retention chart with optional result-size overrides; see the date-override limitation below |
| `get_flags` | List or read feature flag configuration |
| `manage_amp_events` | Read-only list/search/get for raw tracking-plan events |
| `get_properties` | Paginated event or user property definitions |
| `search` | Search charts, raw events, event properties, or user properties within one project |
| `get_experiments` | List or read experiment configuration using the management key |
| `get_deployments` | List Experiment deployments using the management key |

Use `get_amplitude_context` to obtain OAuth project IDs. List pages expose `pagination.next_cursor` and `has_more`. Chart searches stop at 10,000 matching records; narrow large searches with a name query or chart type. For event properties, obtain the exact event name with `manage_amp_events` first.

`query_amplitude_data` reads an existing saved chart. It does not author a new chart, create edit IDs, or persist changes. `get_chart_results` remains the project-key tool for downloadable saved-chart CSV. Never sum daily unique-user counts to produce a unique-user total across the entire period.

Date-override limitation: Amplitude currently rejects the documented `timeRange` input for a tested saved segmentation chart, returning HTTP 502 with an upstream HTTP 400 detail. The same chart succeeds without a date override and with the tested timezone, scalar, and result-size options. This does not establish that every chart is affected. Omitting `timeRange` uses the saved chart range; a failed request for specific dates is reported, not silently retried for a different period.

## Requested capabilities still unavailable

These seven requested tools are **not registered** because authenticated REST probes did not establish a working implementation:

- `render_amplitude_chart`
- `save_chart_edits`
- `rename_chart`
- `query_experiment` (statistical analysis, not configuration)
- `use_amplitude_chart_monitors`
- `use_amp_dashboards`
- `use_amp_notebooks`

Their earlier unpublished hosted-MCP implementations were removed in the REST-only migration. A preview link, a read-only chart definition, or experiment configuration is not a substitute for these outcomes. Full requested parity remains incomplete until supported REST operations are available.

## Existing tools

The original names and compatible inputs are retained: `track_events`, `identify_user`, `query_active_users`, `query_event_segmentation`, `query_funnel`, `query_retention`, `query_sessions`, `query_user_composition`, `export_events`, `get_user_profile`, `get_chart_results`, `manage_cohorts`, `manage_taxonomy`, `manage_annotations`, and `delete_user_data`. User profile lookup is unavailable for EU residency and may require account entitlement.

Exports and chart CSVs are downloadable files, not inline encoded content. Upstream errors include useful provider details. Credentials are region-bound and not forwarded across redirects.

Sources: [official Developer API contract](https://github.com/amplitude/developer-cli/blob/main/openapi/bundled/openapi.bundled.json), [official OAuth implementation](https://github.com/amplitude/wizard/blob/main/src/utils/oauth.ts), [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api), and [Analytics API documentation](https://amplitude.com/docs/apis/analytics).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
