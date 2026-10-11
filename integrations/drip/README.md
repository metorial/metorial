# Drip

Discover authorized accounts and the authenticated user, then manage subscribers, tags, email-series campaigns, workflows and event history. Create, target, test and schedule single-email broadcasts, list segments, and report email performance. Read conversions, forms and custom fields. Submit cart, order and product activity for background processing.

Call `list_accounts` first and pass the selected `accountId` with account operations. Previously saved account settings remain a compatibility fallback. OAuth is intended for public integrations; personal API tokens use Basic authentication for private integrations. Drip documents nonexpiring OAuth tokens.

The twenty-three tools retain the eighteen original keys and add `get_current_user`, `list_campaign_subscriptions`, `manage_broadcast`, `list_segments` and `get_email_metrics`. Collection tools expose provider paging metadata when available. Broadcast sorting uses the documented fields; conversion and form endpoints do not promise pagination.

`manage_broadcast` creates drafts, edits drafts, sets segment audiences, sends test emails, schedules or unschedules sends, and soft-deletes broadcasts. Scheduling sends real email to the audience (everyone eligible when no audience is set). `get_email_metrics` is limited by Drip to 20 reports per account per hour.

Subscriber status, tags, custom events, campaign enrollment and workflow activation can trigger messages or external automations. Use only authorized recipients and records. Subscriber deletion is permanent. Shopper activity can subscribe a person when `initialStatus` is omitted and can change lifetime value or product-triggered automations.

Shopper activity uses the single-record routes (standard hourly limit rather than the 50-per-hour batch limit) and returns `accepted`, `completed: false` and `requestIds`. The legacy `recorded` field remains a boolean and is false while completion is unconfirmed. A queued request is not a completed update, and the public reference does not document a request-status route. Cart URLs and product prices are required by the current API; their existing optional schema fields are preserved with runtime guidance. Monetary values use currency units for shopper activity; subscriber lifetime value is read in cents.

API reference: https://developer.drip.com/

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
