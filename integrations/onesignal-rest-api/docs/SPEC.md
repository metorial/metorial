# OneSignal REST API specification

## Authentication and app selection

The API uses `Authorization: Key <API_KEY>` against `https://api.onesignal.com`. App API Keys authorize messaging, users, subscriptions, aliases, segments, templates, and CSV exports. Organization API Keys authorize listing, retrieving, creating, and updating apps. The keys are not interchangeable. The existing `api_key` auth method retains `token` and accepts an optional `organizationToken` for app operations.

App-scoped tools accept optional `appId`, falling back to the optional legacy configuration value. Discover app IDs and names with `list_apps` when an Organization API Key is available; otherwise use Settings > Keys & IDs. New connections can omit app configuration. OneSignal has no suitable current-user or self-profile endpoint for API-key connections.

## Supported tools

- Messaging: `send_notification`, `view_notifications`, `cancel_notification`. Sending validates one audience strategy, channel/content combinations, documented audience limits, and scheduling combinations. Supports exclusion segments, retry idempotency, and delivery throttling. Listing supports offsets or the time cursor and template filtering; individual results retain outcome metrics.
- Users: `create_user`, `get_user`, `update_user`, `delete_user`. User reads include aliases and subscription identifiers. Property updates preserve explicitly supplied values.
- Aliases: `update_user_aliases`, `delete_user_alias`. Set `external_id` before custom aliases. Conflicts do not merge users. The permanent `onesignal_id` cannot be changed or removed.
- Subscriptions: `create_subscription`, `update_subscription`, `delete_subscription`, `transfer_subscription`. Updates and deletes may be asynchronous. The legacy update `type` input is retained but rejected with guidance to delete and recreate, because the provider makes subscription types immutable.
- Segments: `create_segment`, `list_segments`, `delete_segment`. Up to 200 creation filter entries; listing supports integer offsets and page sizes up to 300.
- Templates: `create_template`, `list_templates`, `get_template`, `update_template`, `delete_template`. Detailed bodies map from the provider's nested `content` block, with compatibility for flat responses. List responses contain summaries; page size is at most 50.
- Apps: `list_apps`, `get_app`, `create_app`, `update_app`. Organization API Key required. Existing App IDs and organization IDs remain available for downstream operations.
- Exports: `export_data` produces a downloadable GZip CSV and preserves `csvFileUrl`. Supports segment, last-active, extra-field, and unsubscribed filters. Downloads may return 404 during generation and expire after three days. Renewing an expired download starts a new export with the same filters and current data; only one export may run per account at once.

## Limits and exclusions

No webhook, Journey, Live Activity, API-key administration, or event-export tools are registered. No live-provider behavior is established by a local build. API errors and validation use structured service failures; no automatic retries are performed for sends or exports.

## Official references

- [REST API overview](https://documentation.onesignal.com/reference/rest-api-overview)
- [Keys & IDs](https://documentation.onesignal.com/docs/en/keys-and-ids)
- [Sending messages](https://documentation.onesignal.com/reference/create-message)
- [User API](https://documentation.onesignal.com/reference/create-user)
- [Aliases](https://documentation.onesignal.com/reference/create-alias)
- [Subscription API](https://documentation.onesignal.com/reference/update-subscription)
- [Templates](https://documentation.onesignal.com/reference/create-template)
- [Apps](https://documentation.onesignal.com/reference/view-apps)
- [Subscription CSV export](https://documentation.onesignal.com/reference/csv-export)
