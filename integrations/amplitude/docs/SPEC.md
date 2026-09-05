# Amplitude REST Integration Specification

Version: `0.2.2`. All production requests use REST APIs. Hosted MCP transport, SDK dependency, connection type, and unpublished wrappers are removed. Original 15 project-key tool IDs and compatible inputs remain intact.

## Authentication and regional routing

`oauth` is an ordinary authorization-code flow with PKCE S256, registered client ID, optional issued secret, callback-state/redirect/region binding, and refresh-token preservation. US endpoints are `https://auth.amplitude.com/oauth2/auth` and `/oauth2/token`; EU uses `https://auth.eu.amplitude.com`. Authorization and token requests do not contain an MCP resource parameter. Public clients use `none`; confidential clients send their configured secret in the token form body.

The existing registered client permits `mcp:read` and `offline_access`. These are provider-defined legacy scope names; the Developer API maps them to granular read permissions. Granular replacement scopes were rejected for this client during discovery. Current OAuth tools are read-only, so no write scope is requested. The HTTP endpoints are `https://developer-api.amplitude.com` and `https://developer-api.eu.amplitude.com`, never a hosted MCP endpoint.

`api_key_secret` retains region, API key, and secret key. Legacy stored configuration region remains a fallback. An additive optional `experimentManagementKey` authorizes only the Experiment Management API with a separate Bearer header on `https://experiment.amplitude.com/api/1` or `https://experiment.eu.amplitude.com/api/1`. No third authentication method is introduced. Project keys, deployment keys, and OAuth tokens are not substituted for that management credential.

## Added tool mapping

| Public tool | REST endpoints / constraints |
| --- | --- |
| `get_amplitude_context` | `GET /v1/context` and `GET /v1/projects`, paginated projects |
| `get_amplitude_charts` | `GET /v1/projects/{project_id}/charts` or `.../charts/{chart_id}`, optional `include_definition` for single read |
| `query_amplitude_data` | `POST .../charts/{chart_id}/query`; read-only saved chart execution, not ad-hoc authoring |
| `get_flags` | `GET /v1/projects/{project_id}/flags` or `.../flags/{flag_id}` |
| `manage_amp_events` | Read-only `GET /v1/projects/{project_id}/events` or `.../events/{event_id}` |
| `get_properties` | `GET .../events/{event_id}/event-properties` or `.../user-properties` |
| `search` | Full-text `q` on chart/event/event-property/user-property list endpoints; one surface per call |
| `get_experiments` | Management API `GET /experiments` or `/experiments/{id}`; configuration only |
| `get_deployments` | Management API `GET /deployments` |

Developer list limits are 1–200 with opaque cursor strings and returned `pagination.next_cursor`/`has_more`. Chart search is capped at 10,000 matching index entries. Management API lists accept limits up to 1000 and numeric offsets. Returned provider objects are preserved; no guessed field remapping or fabricated dates are applied.

Chart query supports saved segmentation, sessions, funnels, and retention. Optional overrides are `time_range`, `timezone`, `exclude_incomplete_datapoints`, `group_by_limit`, and `time_series_limit`. Definition authoring and filter/group-by overrides are not supported. For unique-user metrics, never derive whole-period uniques by summing interval counts, even if provider metadata incorrectly marks a result additive.

The documented `time_range: { start, end }` with ISO `YYYY-MM-DD` dates currently returns Developer API HTTP 502 with detail `Request failed with status code 400` for the tested saved segmentation chart. Default-range execution and the tested timezone, scalar, and result-size options succeed; this is not evidence that all charts reject date overrides. Omitting `timeRange` uses the saved chart range. The integration preserves the upstream error and never silently retries with changed or omitted dates; changing a user-requested period requires their direction.

## Unresolved requested parity

The following unpublished hosted-only tools were removed from registration rather than left as stubs or false successes: `render_amplitude_chart`, `save_chart_edits`, `rename_chart`, `query_experiment`, `use_amplitude_chart_monitors`, `use_amp_dashboards`, and `use_amp_notebooks`.

The public Developer API contract has no corresponding content-write or experiment-analysis operations. Authenticated candidate chart PATCH/PUT/POST and render requests returned 404; the saved chart was confirmed unchanged. Legacy Experiment REST rejected OAuth and Basic credentials, requiring its dedicated management key instead. No browser cookie/session-token authentication is used.

Direct read probes observed questionable upstream chart timestamps and unique-user aggregation hints. They remain provider data, not a reason to invent corrected response values. Provider-specific issues and fixture/entitlement gaps are tracked in the private live E2E report.

## Verification

Schema regression tests cover every registered input as a top-level JSON Schema object. Private live E2E covers provider operations, pagination, authentication mismatch, and actual readback/cleanup. New OAuth consent, token exchange, and refresh must be verified through the normal CLI. EU account access and account entitlements remain separate verification requirements. Full requested parity is not claimed while the seven operations above lack verified REST implementations.

## Official evidence

- [Developer API OpenAPI](https://github.com/amplitude/developer-cli/blob/main/openapi/bundled/openapi.bundled.json)
- [Official OAuth client implementation](https://github.com/amplitude/wizard/blob/main/src/utils/oauth.ts)
- [US issuer discovery](https://auth.amplitude.com/.well-known/openid-configuration)
- [EU issuer discovery](https://auth.eu.amplitude.com/.well-known/openid-configuration)
- [Experiment Management API](https://amplitude.com/docs/apis/experiment/experiment-management-api)
- [Taxonomy API](https://amplitude.com/docs/apis/analytics/taxonomy)
