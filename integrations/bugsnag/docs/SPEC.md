# Bugsnag Integration Specification

This integration exposes 19 tools for the BugSnag Data Access API v2. It covers organizations, projects, errors and events, diagnostic trends and pivots, releases, stability, collaborators, comments, saved searches, and available event fields.

## Authentication and account endpoint

Use a personal auth token generated in the dashboard under My Account. Requests send `Authorization: token <personal-auth-token>` and `X-Version: 2`.

Choose the endpoint that matches the organization's dashboard:

| Dashboard | Data Access endpoint |
| --- | --- |
| `app.bugsnag.com` | `https://api.bugsnag.com` (default) |
| `app.bugsnag.smartbear.com` | `https://api.bugsnag.smartbear.com` |

These are provider hosting choices, not inferred geographic regions. Error Reporting uses the separate `notify.bugsnag.com` or `notify.bugsnag.smartbear.com` hosts and a project notifier API key. It is not a Data Access personal token endpoint. The integration does not expose Error Reporting, builds, sessions, upload, performance, SCIM, or GDPR request APIs.

The connection is verified against the documented accessible-organizations endpoint. The current public API does not document a current-user profile endpoint; the connection profile identifies an accessible organization without inventing a user identity.

## Supported workflows

| Workflow | Tools |
| --- | --- |
| Discover organization and project IDs | `list_organizations`, `get_organization`, `list_projects`, `get_project` |
| Create, update and delete projects | `manage_project` |
| Search and inspect error groups | `list_errors`, `get_error` |
| Update severity, assignment and workflow status | `update_error` |
| Permanently remove one error and its events | `delete_error` |
| Browse occurrences and full diagnostics | `list_events`, `get_event` |
| Discover filter keys and comparisons | `list_event_fields` |
| Inspect trends and distributions | `get_error_trends`, `get_pivots` |
| Inspect releases and primary-stage stability | `list_releases`, `get_stability` |
| Manage organization collaborators | `manage_collaborators` |
| Collaborate on an error | `manage_comments` |
| Save reusable error filters | `manage_saved_searches` |

List tools return one page. Where the provider supplies a `Link` next relation, use `nextPageUrl` as `pageUrl` with the same resource ID and account endpoint. Provider continuation URLs retain filtering and paging state. Cross-origin links, different resource paths, redirects, and credential-bearing page URLs are rejected. Requests expose provider total counts and remaining rate-limit capacity when available; HTTP 429 preserves `Retry-After` seconds without automatically retrying mutations.

Release pages support 1–10 results, defaulting to 5. Other paginated collections support up to 100 results per page. When a continuation URL is provided, its paging and filter state takes precedence over the other list options.

Filters use event-field keys with arrays of `{ type, value }` comparisons. Supported comparisons are `eq`, `ne`, and `empty`; use `list_event_fields` to discover project-specific fields. The established `search` input searches event-message substrings.

Error updates map status to the documented `open`, `fix`, `snooze`, and `ignore` operations; severity and assignment use `override_severity` and `assign`. Multiple fields and explicit IDs are applied sequentially, then read back. A later failure reports how many errors completed and warns that earlier changes remain. There is no implicit project-wide bulk mutation.

Saved-search creation posts to `/saved_searches` with the project ID, `filters`, and `project_default: false`. Existing `searchFilters` inputs and outputs remain available under their established names. New saved searches are private and do not change project defaults.

## Existing-input compatibility and provider limits

All 16 established tool keys and field types remain. Pagination and filter discovery fields are additive. Existing event sort values remain accepted and map to the current event timestamp sort.

The current trend resolutions are `1m`, `5m`, `30m`, `2h`, and `12h`. Other established resolution enum values remain in the schema but return a clear unsupported-parameter error. Omit resolution to use `bucketsCount` (1–50, default 30). Project and individual-error trends use the current plural `/trends` endpoints.

`manage_project.releaseStages` remains in the input schema, but release stages are derived from reported events and cannot be changed by this API. `get_stability.releaseStage` also remains, but the stability-trend endpoint only reports the project primary release stage; supplying this unsupported filter returns guidance instead of silently ignoring it. Projects without sessions return a null stability trend.

Deletion and consolidated tools that can remove resources are marked destructive. Project and error deletions cannot be undone. The diagnostic tools return structured data, not downloadable files.

## Official references

- [Current Data Access API](https://developer.smartbear.com/bugsnag/docs/bugsnag-data-access-api)
- [Published Data Access OpenAPI](https://api.swaggerhub.com/apis/smartbear-public/bugsnag-data-access-api/2/swagger.json)
- [Filtering](https://developer.smartbear.com/bugsnag/docs/data-access-filtering)
- [Pagination](https://developer.smartbear.com/bugsnag/docs/data-access-pagination)
- [Rate limits](https://developer.smartbear.com/bugsnag/docs/data-access-rate-limiting)
- [Error Reporting API](https://developer.smartbear.com/bugsnag/docs/bugsnag-error-reporting-api)
