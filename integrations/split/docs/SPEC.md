# Split Integration Specification

Split, now Harness Feature Management & Experimentation (FME), provides an Admin API for managing feature flag releases and targeting.

## Authentication

This integration accepts a Split Admin API key and sends `Authorization: Bearer <key>` to `https://api.split.io/internal/api/v2` and the flag-set API at `/internal/api/v3`. Keys need the roles and resource scopes required by each operation. The optional default workspace and environment are tool-scoped settings; both may also be supplied per call.

Harness PATs and SATs use `x-api-key` on supported, non-deprecated Split endpoints. They are not supported by this integration's Admin API Key connection method. Legacy user and group endpoints are marked as moving to Harness in the current API documentation and may be unavailable on migrated accounts.

## Supported workflows

- Discover projects (workspaces), environments, traffic types, and rollout statuses. Project discovery supports Harness organization and project identifiers.
- Create, get, list, update, kill, restore, and delete feature flags. Creation can also configure an environment definition when all required definition fields are supplied.
- List full environment definitions for release audits and targeting inspection.
- Update descriptions, rollout statuses, treatment configurations, targeting rules, percentage allocation, and impression settings.
- Create and delete standard segments, activate or deactivate them in environments, add or remove keys, and read paginated key membership. JSON uploads add keys without replacing existing membership and accept at most 10,000 keys per call.
- Create, list, get, and delete flag sets.
- Use legacy user invitations, listing, retrieval, updates, and pending-user deletion; use legacy group creation, listing, updates, and deletion.

## Pagination and targeting

Feature flags, definitions, projects, segments, and segment keys use offset pagination. User and flag-set listings expose their next cursor. Group listings expose the provider's page count and cursors; an organization-wide total is returned only when the provider supplies one.

The feature flag name filter uses case-sensitive substring matching across the documented list pages. `totalCount` retains the provider's workspace/tag total; `matchingCount` reports name matches. Offset and limit select the requested page of matches.

Numeric/date matcher bounds keep the `between` field. Semantic version ranges use `semverBetween`, which maps to the provider's `between` value for `BETWEEN_SEMVER` rules. Percentage bucket sizes must total 100; treatment configurations remain JSON strings.

The legacy List Environments output requires production and creation-time metadata. If an account returns only the summaries shown in the official reference, the tool reports that limitation explicitly. Environment names or IDs from project settings can still be supplied to flag tools.

## Reference

- [Authentication](https://docs.split.io/reference/authentication)
- [Projects](https://docs.split.io/reference/get-workspaces)
- [Feature flags](https://docs.split.io/reference/feature-flag)
- [Feature flag definitions](https://docs.split.io/reference/feature-flag-definition)
- [Segments](https://docs.split.io/reference/segments-overview)
- [Flag sets](https://docs.split.io/reference/list-flag-sets)
- [Legacy users](https://docs.split.io/reference/list-users)
- [Legacy groups](https://docs.split.io/reference/list-groups)
