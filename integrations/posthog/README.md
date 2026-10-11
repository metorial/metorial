# <img src="https://provider-logos.metorial-cdn.com/posthog.svg" height="20"> Posthog

Capture and analyze product usage events, manage feature flags, run A/B test experiments, and create user surveys. Track persons and groups, evaluate feature flags for specific users, query analytics data using HogQL, and manage cohorts. Retrieve session recording metadata, create and manage insights and dashboards (trends, funnels, retention, paths). Manage projects, organizations, annotations, actions, and event/property definitions.

## Authentication

Choose **OAuth 2.0 (Client Metadata URL)** for a new public OAuth client. Host a
JSON client metadata document at an HTTPS URL on a domain you control, and use
that exact URL as the client ID. Include `client_id`, `client_name`, and
`redirect_uris`; every production callback URL must be listed exactly. PostHog
fetches the document directly, so serve HTTP 200 without redirects. No client
secret is issued or sent for this method.

Both OAuth methods use authorization code with S256 PKCE. Choose **OAuth 2.0**
only for an existing confidential PostHog application with a client ID and client
secret. Refresh tokens are supported by both methods.

Every connection, including personal API key connections, must select US Cloud,
EU Cloud, or a self-hosted instance. A self-hosted instance URL must be the
public HTTPS origin, such as `https://posthog.example.com`, with no path. The
**OAuth 2.0** method supports PostHog Cloud only; self-hosted instances use a
personal API key or **OAuth 2.0 (Client Metadata URL)**. Sign-in, token refresh, profile
requests, and all API calls use that location. PostHog does not report an
account's region in its token response, so EU Cloud accounts must select EU.

Use a PostHog personal API key for a connection tied to your own account. Event
capture and feature-flag evaluation also require the optional project token;
an OAuth access token does not replace that public project token.

The requested OAuth scopes cover the existing tools: read/write actions,
annotations, cohorts, dashboards, experiments, feature flags, groups, persons,
and surveys; read insights, organizations, users, projects, session recordings,
event definitions, property definitions, and queries. The `scopes` list under the
`com.posthog` object in the client metadata document caps the grantable scopes,
so it must include every requested scope. Verification is optional and must
be requested separately for each PostHog cloud region.

See [PostHog OAuth setup](https://posthog.com/docs/api/oauth),
[OAuth development guide](https://github.com/PostHog/posthog/blob/master/docs/published/handbook/engineering/oauth-development-guide.md),
and [server metadata](https://oauth.posthog.com/.well-known/oauth-authorization-server).

## Tools

### Capture Event

Send one or more events to PostHog. Supports single event capture or batch capture of multiple events. Use this to track pageviews, custom events, screen views, and identify users.

### List Event Definitions

List all event definitions in the project. Event definitions describe the possible event names that have been captured. Use this to discover which events are available for querying, filtering, and analysis.

### List Projects

List all projects accessible with the current credentials. Returns project IDs, names, and tokens needed for configuration.

### List Organizations

List organizations accessible with the current credentials. Use an organization ID with List Projects when targeting PostHog's organization-scoped project endpoint.

### Get Current User

Retrieve the current PostHog user, current organization, and current project context.

### List Session Recordings

List session recording metadata. Supports filtering by person, date range, and pagination. Note: This returns metadata only, not the raw replay data. Use the PostHog UI to view full replays.

### List Annotations

List annotations on charts/dashboards. Annotations mark significant events or deployments with text notes at specific dates.

### List Cohorts

List all cohorts in the project. Cohorts are groups of users that match specific criteria. Static cohorts are manually managed lists, while dynamic cohorts are automatically updated every 24 hours.

### List Dashboards

List all dashboards in the project. Supports searching by name.

### List Experiments

List A/B test experiments in the project. Returns experiment metadata, status, and associated feature flag keys.

### List Feature Flags

List all feature flags in the project. Supports searching by flag key or name. Returns flag configuration including key, active status, rollout percentage, and targeting rules.

### List Insights

List analytics insights (trends, funnels, retention, paths, stickiness, lifecycle). Supports searching by name and filtering to saved insights only.

### List Persons

Search and list person profiles in PostHog. Supports filtering by search query and person properties. Returns paginated results with person details including distinct IDs and properties.

### List Group Types

List configured PostHog group types and their group type indexes.

### List Groups

List groups for a specific group type, with optional group key or search filtering.

### List Surveys

List all surveys in the project with their configuration, questions, and status.

### List Actions

List PostHog actions. Actions group one or more event patterns into reusable analytics definitions.

### Run HogQL Query

Execute an ad-hoc HogQL query against your PostHog data. HogQL is PostHog's SQL-like query language that supports querying events, persons, sessions, and more. Use this for custom analytics queries, aggregations, and data exploration that go beyond predefined insights.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
