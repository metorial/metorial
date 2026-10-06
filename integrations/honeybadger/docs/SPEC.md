# Honeybadger API capabilities

Personal tokens authenticate the JSON Data API with HTTP Basic Auth (token as username, empty password). Choose the US or EU region in authentication. Project API keys authenticate error, event, and deployment reporting; ID-based check-in pings use the check-in ID alone.

Discover accounts with `list_accounts` and projects with `list_projects`. Project details include settings and Insights stream IDs. Lists return one page and expose `nextUrl`; pass that exact URL to continue with the same filters. Notices and comments have separate continuation URLs in `get_error_details`.

The integration supports project lifecycle, fault search/details, resolve/ignore/assignment/pause and bulk resolution, comments and comment deletion, uptime checks/outages, check-in lifecycle/pings, deployment records, team lifecycle/members/invitations, environments, Insights queries, and event/error reporting. Updates and deletes return acceptance; read the resource afterward to verify state. Bulk resolution can be queued for background work. Reporting acceptance does not guarantee later ingestion.

Uptime checks use UUID identifiers exposed as `siteIdentifier`; pass that value into the existing `siteId` input. The legacy numeric output `siteId` appears only if the provider supplies a number. Project credentials are not returned in metadata.

Deployment reports target the configured primary project key, which must match the chosen project, and may resolve errors or notify integrations. Team invitations send email. Uptime checks can issue requests to the monitored URL; use inactive checks for safe verification. Event ingestion consumes the project quota, and its data remains until provider retention expires. Insights queries may be limited by your subscription.

Official references: [Data API](https://docs.honeybadger.io/api/getting-started/), [API catalog](https://docs.honeybadger.io/api/), [regions](https://docs.honeybadger.io/resources/data-residency/).
