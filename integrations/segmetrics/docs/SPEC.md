# SegMetrics

Marketing attribution imports, reports, and contact journeys.

## Connection

API-key authentication stores the account ID alongside the key. Both values are available under the gear menu → Account Settings. The API receives the key in `Authorization`.

Import tools accept `integrationId`. Find it under gear menu → Integrations → integration menu → Configure Integration, using the last number in the URL. Existing connections can continue using previously stored account/integration settings. The public API documents no identity, account, or import-integration discovery endpoint.

## Capabilities

- Contacts and tags: create/update/delete contacts; add/remove tags. Contact imports replace supplied tags and merge custom fields; `null` removes a custom field.
- Orders: upsert/delete invoices with line items, subscription links, discounts, tax, and shipping. Amounts use cents.
- Subscriptions: upsert/delete, including billing dates, product name, trial end, cancellation, and end date. A separate order records payment. `lastBillDate` is required by the provider. Legacy `trialStart` remains accepted and forwarded as `trial_start`, which current documentation does not define.
- Products and ads: upsert products and record daily ad performance; inline ads/ad sets include their parent IDs.
- Reports: retrieve report data with optional saved report IDs; page through customer journeys with `limit` (1–100); fetch one contact with optional related data, including companies.
- `run_report_query`: execute Data Explorer JSON from report-actions → Access from API, retaining additional query fields and raw results.
- Visitor identification: associate an optional session UID with email, external contact ID, or both.

Raw provider responses remain available. No file-producing endpoints or outbound event subscriptions are documented in the audited API reference.

## Provider references

- [API reference](https://developers.segmetrics.io/)
- [Account settings](https://docs.segmetrics.io/article/54-team-management)
- [Integration configuration and IDs](https://docs.segmetrics.io/article/113-kajabi-lead-tracking)
