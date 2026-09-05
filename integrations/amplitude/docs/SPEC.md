# Amplitude Integration Specification

## API-key tools

The existing 15 tool IDs remain available with `api_key_secret`: event ingestion, Identify/group Identify/user mapping, six Dashboard REST queries, raw event ZIP export, user profile lookup, saved chart CSV download, cohorts, taxonomy, annotations, and user deletion jobs. User profile lookup is unavailable for EU residency.

Region belongs to authentication. Old connections may fall back to their previously stored configuration region. New connections choose the region once during authentication. Files are downloadable contents, with useful metadata in structured output.

## Official hosted MCP connection

`mcp_oauth` uses `https://mcp.amplitude.com/mcp` or `https://mcp.eu.amplitude.com/mcp` with the maintained MCP SDK Streamable HTTP client. Each invocation initializes a session, performs an allowlisted call, terminates the session where supported, and closes the transport. Timeouts bound initialization, invocation, and termination.

The ordinary OAuth authorization-code flow uses a pre-registered client ID and PKCE S256. Public clients use token authentication `none`; confidential clients use their issued client secret. The registered client must allow the exact callback URL shown during setup. There is no runtime client registration or separate registration mode. Credentials use standard OAuth credential storage. Authentication output retains region, access/refresh token, expiry, and the token authentication method. Refresh preserves the prior refresh token when omitted. Callback state binds the PKCE verifier, authorization state, redirect URI, and region.

The method requests `mcp:read`, `mcp:write`, and `offline_access`. Amplitude enforces project permissions and product entitlements. API-key connections cannot invoke hosted tools; OAuth connections cannot invoke project-key REST tools.

## Hosted tool mapping

Input schemas were captured from the authenticated official US server on 2026-09-05. Static Zod schemas preserve nested chart models, enums, field descriptions, and bounds; they never fetch executable definitions at runtime. All tools serialize as top-level JSON Schema objects. Project IDs retain the public string format and convert to numbers only for upstream context and entity search, whose authenticated schemas require numeric values.

| Public tool | Official operation |
| --- | --- |
| `get_amplitude_context` | Same name; organization/user/projects, project settings and context documents |
| `search` | `search_amp_entities` with full search filters |
| `get_amplitude_charts` | Same name: link, typed, definition, data, guide |
| `query_amplitude_data` | Same name: typed chart or raw definition, yielding an edit ID |
| `render_amplitude_chart` | Same name: saved chart or edit visualization |
| `save_chart_edits` | Same name: persist edits with names/descriptions and destination |
| `rename_chart` | Same name: persist saved chart name/description |
| `get_experiments` | `use_amp_experiments`, fixed action `get` |
| `query_experiment` | `use_amp_experiments`, fixed action `analyze` |
| `get_flags` | `use_amp_flags`, fixed action `get` |
| `get_deployments` | `use_amp_flags`, fixed action `list_deployments` |
| `manage_amp_events` | Same name, `get` only: event/custom/labeled/all |
| `get_properties` | `get_amp_taxonomy`, fixed action `properties`, all seven property surfaces |
| `use_amplitude_chart_monitors` | Same name: alerts/config/history, subscription changes, enabled state |
| `use_amp_dashboards` | Same name: get/create/edit/replace_properties/subscribe/edit_subscription |
| `use_amp_notebooks` | Same name: get/create/edit |

`manage_amp_events` exposes only read fields and a literal `get` action. The handler fixes the action and the transport independently rejects non-read event operations. Experiment/flag aliases do not expose their upstream create/update actions. Consolidated content tools are conservatively marked destructive because they can replace/remove content or subscriptions. Saving charts is a real supported upstream mutation, not a preview substitute.

## Workflows and output

Discover project IDs with `get_amplitude_context` and resource IDs/names with `search`. Query exactly one typed `chart` or raw `definition`. Render the returned edit ID, then save through `save_chart_edits`; verify its returned permanent chart ID with an independent chart read. For modifications, retrieve typed parameters first, edit them, and pass the parent `chartId` with the query. Renaming updates the saved chart directly.

Dashboard/notebook edits require prior readback timestamps and reject ambiguous missing edit targets. Shared-space destinations can publish and notify members. Subscription operations require an intended delivery channel and cadence. Read-only events remain separate from REST taxonomy mutations and event ingestion.

Results retain provider text, structured data, links, identifiers, and pagination. Image/audio/embedded resources are downloadable files with MIME type/size metadata. MCP error results are failures, not successful responses. Credential values are never included in error messages.

## Verification

Authenticated US tools/list returned 45 official tools including save and rename. This integration exposes the requested 15 plus supporting query_amplitude_data, not every upstream tool. Verification status, account-specific restrictions, and cleanup outcomes belong to the current private live E2E report; schema capture alone is not evidence that every operation has passed. US/EU live coverage, permission failures, token refresh, mutation readbacks/cleanup, schema regressions, build, and tool-use evaluations are required completion checks.

## Official sources

- [MCP tools and capabilities](https://amplitude.com/docs/amplitude-ai/amplitude-mcp)
- [Supported remote client connection](https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients)
- [US OAuth metadata](https://mcp.amplitude.com/.well-known/oauth-authorization-server)
- [EU OAuth metadata](https://mcp.eu.amplitude.com/.well-known/oauth-authorization-server)
- [Chart workflow](https://github.com/amplitude/mcp-marketplace/blob/main/plugins/amplitude/skills/build-charts-with-typed-params/SKILL.md)
