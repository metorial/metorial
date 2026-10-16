# Linkly Integration

Linkly is a URL shortening and link analytics platform. This package uses API v1 at `https://api.linklyhq.com/api/v1` with Bearer API-key authentication. The connection stores its workspace ID; configuration has no duplicate credential or workspace property. No OAuth refresh is needed.

## Supported capabilities

| Area | Tools |
| --- | --- |
| Links | `create_link`, `update_link`, `get_link`, `list_links`, `delete_links`, `bulk_upsert_links` |
| Analytics | `get_click_analytics`, `get_click_counters`, `export_click_analytics` |
| Discovery | `list_workspaces`, `list_domains` |
| Webhooks | `manage_webhooks` for link or workspace subscriptions |

Bulk upsert accepts up to 1000 items and returns the complete provider response so callers can inspect individual results. The existing single-link fields, required destination URL, and `geo`/`device`/`rotator` rule inputs remain supported. Geographic and device rules are translated to the provider's `country` and `platform` values.

Analytics filters accept comma-separated or hyphen-separated link IDs; requests use hyphens. Zero click counts are retained. CSV and TSV exports return downloadable files. Downloads consume the workspace analytics API allowance; provider rate limits and caching apply.

Webhook subscriptions can receive clicks and link lifecycle events. The integration manages subscriptions; it does not expose event triggers. Missing action-specific inputs and upstream API failures produce structured errors.

## Documentation and limits

- [API reference](https://linklyhq.com/url-shortener-api-reference)
- [Link creation, rules, and bulk guide](https://linklyhq.com/support/link-shortening-api)
- [Analytics limits and export guide](https://linklyhq.com/support/analytics-api)
- [QR code API guide](https://linklyhq.com/support/qr-code-generator-api)

The reference offers no suitable current-user/profile endpoint; workspace discovery remains available. Domain mutation, link restoration, link-list export, QR generation, and event triggers are outside this package's current tool surface. QR guidance labels availability as Pro and above, so this refresh does not add that plan-dependent capability. No live provider behavior or downloadable file contents were verified during this refresh.
