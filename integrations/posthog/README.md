# <img src="https://provider-logos.metorial-cdn.com/posthog.svg" height="20"> Posthog

Capture and analyze product usage events, manage feature flags, run A/B test experiments, and create user surveys. Track persons and groups, evaluate feature flags for specific users, query analytics data using HogQL, and manage cohorts. Retrieve session recording metadata, create and manage insights and dashboards (trends, funnels, retention, paths), and configure data pipeline destinations and sources. Manage projects, organizations, annotations, actions, and event/property definitions.

## Tools

### Capture Event

Send one or more events to PostHog. Supports single event capture or batch capture of multiple events. Use this to track pageviews, custom events, screen views, identify users (\

### List Event Definitions

List all event definitions in the project. Event definitions describe the possible event names that have been captured. Use this to discover which events are available for querying, filtering, and analysis.

### List Projects

List all projects accessible with the current credentials. Returns project IDs, names, and tokens needed for configuration.

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

### List Surveys

List all surveys in the project with their configuration, questions, and status.

### Run HogQL Query

Execute an ad-hoc HogQL query against your PostHog data. HogQL is PostHog's SQL-like query language that supports querying events, persons, sessions, and more. Use this for custom analytics queries, aggregations, and data exploration that go beyond predefined insights.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
