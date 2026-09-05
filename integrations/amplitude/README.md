# <img src="https://provider-logos.metorial-cdn.com/amplitude.svg" height="20"> Amplitude

Track user behavior, query product analytics, export raw events, and maintain Amplitude project data. Project API credentials enable the existing REST tools. Amplitude MCP OAuth enables chart querying, rendering, saving, and renaming, experiment discovery and analysis, tracking-plan reads, dashboards, notebooks, and chart monitors.

## Connections

- **API Key + Secret Key** (`api_key_secret`): choose the project's US or EU region and enter its API and secret keys. Existing connections retain their stored region.
- **Amplitude MCP OAuth** (`mcp_oauth`): configure a pre-registered OAuth client ID, choose US or EU, and authorize your Amplitude account. Supply a client secret only when Amplitude issued one for that client. Authorization uses PKCE. This connection requests `mcp:read`, `mcp:write`, and `offline_access` and refreshes expired access tokens. It does not enable the API-key REST tools.

Enter the registered client ID and any issued client secret in the standard OAuth credential fields. The client must allow the callback URL shown during setup for the selected Amplitude region. Public clients use PKCE without a secret; confidential clients also send their issued secret. There is one OAuth connection method, with no runtime client registration.

## Hosted MCP tools

These 16 tools use schemas captured from Amplitude's authenticated official MCP server. They preserve provider results, identifiers, links, and downloadable files. Requested public names remain stable where Amplitude consolidated an operation into another upstream tool.

| Tool | Supported operation |
| --- | --- |
| `get_amplitude_context` | Current user, organization, and projects; optional project settings |
| `get_amplitude_charts` | Chart links, typed parameters, raw definitions, data, or parameter guides |
| `query_amplitude_data` | Typed or raw analytics queries; returns chart edit IDs |
| `render_amplitude_chart` | Render a saved chart or edit |
| `save_chart_edits` | Persist edits as saved charts and return permanent IDs |
| `rename_chart` | Persist a saved chart's name and optional description |
| `get_experiments` | Read experiment configuration by discovered IDs |
| `query_experiment` | Analyze results, optionally selecting metrics, filters, and a group-by |
| `get_flags` | Read feature flag configuration by discovered IDs or keys |
| `get_deployments` | List Experiment deployments |
| `search` | Search saved content, experiments, flags, events, properties, and documentation |
| `manage_amp_events` | Read-only `get` for raw, custom, and labeled event definitions |
| `get_properties` | Event, user, group, derived, lookup, channel, or persisted properties |
| `use_amplitude_chart_monitors` | Alerts, configuration, history, subscriptions, and enabled state |
| `use_amp_dashboards` | Read, create, edit, replace chart properties, and scheduled deliveries |
| `use_amp_notebooks` | Read, create, and edit notebook content |

Find IDs with `search` and projects with `get_amplitude_context` before calling resource-specific tools. `manage_amp_events` never accepts mutation operations. API-key `get_chart_results` downloads a saved chart's CSV; OAuth `render_amplitude_chart` renders a visualization instead.

## Chart and content workflows

Discover exact event/property names, build a typed chart, and call `query_amplitude_data`. Its `chartEditId` can be rendered or passed as `charts[].editId` to `save_chart_edits` with a name and description. Read the permanent saved ID separately to verify persistence. `rename_chart` changes the saved name directly; a preview URL alone is not a saved change.

Read dashboards/notebooks before editing and pass their last-modified timestamp to detect concurrent changes. Saving into shared spaces can publish content and notify members. Scheduled deliveries require the intended channel and cadence. Account permissions and product entitlements still apply; supporting an operation does not grant additional Amplitude access.

Sources: [official MCP guide](https://amplitude.com/docs/amplitude-ai/amplitude-mcp), [connection guide](https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients), and [official tool workflow examples](https://github.com/amplitude/mcp-marketplace).

## Tools

### Delete User Data

Request deletion of user data from Amplitude for privacy compliance (GDPR/CCPA). Supports deleting a single user or multiple users in bulk. You can also check the status of pending deletion jobs.

### Export Events

Export raw Amplitude event files for an uploaded-time range as a downloadable ZIP file. Structured output contains metadata such as MIME type and byte length.

### Get Chart Results

Fetch downloadable CSV results from a saved chart by its chart ID. This reads saved chart data; it does not discover, render, save, or rename charts.

### Get User Profile

Retrieve a user's profile from Amplitude, including user properties, computed user properties, and synced cohort memberships. Look up by user ID or Amplitude ID. This API is unavailable for EU projects.

### Identify User

Set or update user properties for a specific user without sending an event. Supports Amplitude's property operations like $set, $setOnce, $add, $append, $prepend, $unset, and $clearAll. Can also be used for group identification and user identity mapping (aliasing).

### Manage Annotations

Manage chart annotations in Amplitude. Annotations mark important events on time-series charts (e.g., releases, campaigns, milestones). List, create, update, or delete annotations.

### Manage Cohorts

List cohorts, retrieve a cohort from the discoverable cohort list, check Behavioral Cohorts Download API usage, upload static cohorts, and incrementally add or remove cohort membership.

### Manage Taxonomy

Manage your Amplitude tracking plan (taxonomy). Create, update, delete, and list event types, event properties, user properties, and event categories. Useful for programmatically maintaining a clean, well-documented tracking plan.

### Query Active Users

Retrieve active and new user counts over a specified date range. Returns time-series data showing how many users were active (performed any event) and how many were new during each interval. Supports segmentation and grouping by user properties.

### Query Event Segmentation

Analyze event data with segmentation, filtering, and grouping. Returns time-series or aggregate data for specific events, similar to Amplitude's Event Segmentation chart. Supports metrics like event totals, uniques, DAU, session averages, property sums/averages, and more.

### Query Funnel

Analyze conversion funnels to understand how users progress through a sequence of events. Returns step-by-step conversion rates and drop-off data. Supports "this order" (strict sequence) and "any order" modes, plus segmentation and grouping.

### Query Retention

Analyze user retention to understand how well users are retained over time after performing a starting event. Measures how many users come back to perform a return event on subsequent days/weeks/months.

### Query Sessions

Retrieve session metrics including session length distribution and average sessions per user over a date range. Useful for understanding user engagement depth and session patterns.

### Query User Composition

Analyze the distribution of a user property across your active users. Returns how many users have each value of the specified property (e.g., country breakdown, platform split, plan type distribution).

### Track Events

Send one or more events to Amplitude for analytics tracking with user properties, event properties, revenue data, and selected device metadata. Use the batch mode for high-volume ingestion (>1000 events/second).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
