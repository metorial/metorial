# <img src="https://provider-logos.metorial-cdn.com/split.png" height="20"> Split

Manage feature flags, segments, and experimentation for software releases. Create, update, kill, restore, and delete feature flags with targeting rules, percentage-based rollouts, and multiple treatments. Organize flags into flag sets and manage user segments for targeting. Run A/B experiments and measure feature impact on metrics via events. Manage environments, projects, traffic types, and change request approval workflows. Administer users, groups, and permissions. Receive webhooks for audit logs, impressions, and metric alerts.

## Tools

### Create Feature Flag

Create a new feature flag in a Split workspace and optionally set up its initial definition in an environment. If treatments, defaultTreatment, and defaultRule are provided along with an environment, the flag definition will be created immediately.

### Delete Feature Flag

Permanently delete a feature flag from all environments. This removes the flag definition everywhere and cannot be undone. Use the update tool with \

### Get Feature Flag

Retrieve a feature flag's metadata and optionally its full definition in a specific environment. When an environment is provided, returns the complete targeting configuration including treatments, rules, default rule, traffic allocation, and kill status.

### List Environments

List all environments in a Split workspace. Returns environment names, IDs, production flags, and creation times. Useful for discovering available environments before managing flag definitions.

### List Feature Flags

List feature flags in a Split workspace. Supports filtering by name or tag and pagination. Returns flag metadata including name, description, traffic type, tags, and rollout status.

### List Segments

List all segments in a Split workspace. Returns segment names, descriptions, and associated traffic types.

### List Traffic Types

List all traffic types in a workspace. Traffic types define the kind of entities (e.g., "user", "account") that feature flags target. Needed when creating feature flags or segments.

### List Workspaces

List all workspaces (projects) in the Split organization. Returns workspace IDs, names, and whether they require title/comments for changes. Useful for discovering available workspaces.

### Manage Environment

Create or delete an environment in a Split workspace. Use action "create" to add a new deployment environment, or "delete" to remove one.

### Manage Flag Set

Create, list, get, or delete flag sets. Flag sets are logical groupings of feature flags within a workspace. Use action "create" to create a new flag set, "list" to list all flag sets, "get" to retrieve details, or "delete" to remove one.

### Manage Groups

Create, list, update, or delete groups in the Split organization. Groups are used to organize users and assign permissions collectively.

### Manage Segment

Create, delete, or manage keys in a user segment. Supports creating segments, activating them in environments, uploading/removing keys, and fetching current keys. Segments are used for targeting groups of users in feature flag rules.

### Manage Users

Invite, list, get, update, or delete users in the Split organization. Supports inviting new users by email, listing all users with filtering, retrieving user details, updating user status, and removing pending users.

### Update Feature Flag

Update a feature flag's metadata (description, rollout status) or its environment-level definition (treatments, rules, default rule, traffic allocation, individual targeting keys). Combines multiple update capabilities into a single tool. Provide the environment to update the targeting definition; omit it to update only metadata.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
