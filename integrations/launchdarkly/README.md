# <img src="https://provider-logos.metorial-cdn.com/launch-darkly-logo.png" height="20"> LaunchDarkly

Manage LaunchDarkly feature flags, targeting, projects, environments, and segments. Inspect connected credentials, contexts, members, metrics, experiments, and change history; invite account members; and receive signed change notifications.

## Tools

### Create Feature Flag

Create a new feature flag in a LaunchDarkly project. The flag will be created in every environment within the project. By default creates a boolean flag; provide custom variations for multivariate flags.

### Delete Feature Flag

Permanently delete a feature flag from a project. This removes the flag from all environments. Use with caution — this cannot be undone.

### Get Feature Flag

Retrieve detailed information about a specific feature flag, including its variations, targeting rules, and environment-specific configuration. Use this to inspect a flag's full setup before making changes.

### Get Current Identity

Identify the API credential connected to LaunchDarkly, including its account, token kind, scopes, and member profile when available.

### Get Segment

Retrieve one segment with its targeting rules, rule and clause IDs, explicitly included and excluded context keys, and big-segment metadata. Use this before semantic updates that refer to existing rule or clause IDs.

### Invite Members

Invite new members to your LaunchDarkly account. Send invitations by email and optionally assign a built-in role or custom roles.

### List Environments

List all environments within a LaunchDarkly project. Returns environment keys, names, colors, and SDK keys.

### List Experiments

List experiments in a LaunchDarkly project and environment. Experiments validate the impact of features by measuring metrics against flag variations.

### List Feature Flags

List feature flags in a LaunchDarkly project. Supports filtering by tag, environment, and search query. Returns flag keys, names, kinds, and their current status in the specified environment.

### List Members

List account members in your LaunchDarkly organization. Filter by role or search by name/email. Returns member details including roles and status.

### List Metrics

List custom metrics defined in a LaunchDarkly project. Metrics track events in your application and are used in experiments to measure the impact of flag variations.

### List Projects

List all projects in your LaunchDarkly account. Returns project keys, names, tags, and environment counts.

### List Segments

List user segments in a LaunchDarkly environment. Segments group contexts for bulk flag targeting. Returns segment keys, names, and membership counts.

### Manage Environment

Create, update, or delete an environment within a LaunchDarkly project. Environments hold separate flag configurations, SDK keys, and context data.

### Manage Project

Create a new project or update an existing one in LaunchDarkly. When creating, provide a key and name. When updating, provide the project key and the fields to change (name, tags). To delete a project, use the delete action.

### Manage Segment

Create, update, or delete a user segment in a LaunchDarkly environment. Segments group contexts for bulk flag targeting. Use semantic patch instructions to add/remove included or excluded context keys.

### Query Audit Log

Search the LaunchDarkly audit log for change history entries. Query by date range, full-text search, or resource specifier. Useful for compliance, debugging, and tracking who changed what and when.

### Search Contexts

Search for contexts (users, services, machines, etc.) that have encountered feature flags in an environment. Filter by kind, key, or attributes. Contexts are scoped to a specific project and environment.

### Toggle Feature Flag

Quickly turn a feature flag on or off in a specific environment. This is a convenience tool for the most common flag operation — no need to construct semantic patch instructions manually.

### Update Feature Flag

Update a feature flag's configuration using LaunchDarkly's semantic patch. Supports toggling on/off, updating name/description/tags, changing fallthrough variations, adding/removing targeting rules, and setting individual targets. All changes are environment-specific unless they modify flag-level properties.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
