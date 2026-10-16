# Doppler Marketing Automation API

This package targets the email marketing API at `https://restapi.fromdoppler.com`, documented by the [official Swagger contract](https://restapi.fromdoppler.com/swagger/current/swagger.json) and [resource relations](https://restapi.fromdoppler.com/docs/rels/).

## Authentication and account scope

Use `Authorization: token <API_KEY>`. The [authentication guide](https://restapi.fromdoppler.com/docs/gettingstarted) recommends the header instead of an `access_token` query parameter. The account email is a known login value, configured once and encoded into `/accounts/{accountName}`. API keys have no documented token-refresh lifecycle.

`get_account_home` reads the selected account's documented home resource and preserves its message and links. This is not a synthesized user profile. The provider's detailed `UserAccount` resources belong to Client Manager APIs and require a manager account name plus a managed user ID.

## Surface

- Lists: paginated collection, single read, create, rename, delete.
- Subscribers: single read, paginated list membership, account search with `keyword` and `updatedAfter`, add/update membership, remove membership, account unsubscribe, asynchronous list imports, task status.
- Fields: definitions and the create/edit/delete relations documented by the provider. Field mutation relations are absent from the current Swagger routes, so their availability remains unverified without a live account.
- Campaigns: paginated and single reads, draft creation, partial-update preservation, deletion, immediate/scheduled shipping, HTML replacement/download, recipient list/segment replacement and inspection.
- Reporting: campaign results summary combined with campaign identity; unsubscribed contacts with date filters.

The API uses `page` and `per_page`. Subscriber endpoints support pages up to 100. Account-search `resumeFrom` is an int64 continuation value and accepts positive integers up to JavaScript's exactly representable limit, independently of int32 resource IDs. The campaign status filter is named `state`; the list membership endpoint has no documented date filter. Existing `from`/`to` inputs there remain present and produce a clear validation error rather than silently returning unfiltered data.

## Provider mappings

Creation results contain string IDs; list and campaign IDs are validated and converted to the existing numeric tool outputs. Custom-field `sample` is preserved; older `sampleValue` responses are accepted as a fallback. Both aliases are validated when present. Subscriber `unsubscribedDate` and older `unsubscriptionDate` map to the existing `unsubscriptionDate` output while the original property and value stay in raw. Campaign reports use `/campaigns/{id}/results-summary`; `totalTimesOpened`, `totalHardBounces`, `totalSoftBounces`, and `totalUnsubscribers` map to the existing tool names. The native `totalShipped` metric is required and preserved; recipient counts never substitute for shipped counts. Delivery rate is `successFullDeliveries / totalRecipients * 100` and is omitted for a zero denominator.

Read tools retain the provider response in `raw`, with credential values removed. Nullable optional scalars are omitted from the original scalar-only fields and retained exactly in `raw`; absent values are not replaced with empty strings, zero, false, or invented status values. Missing required collection/identity/metric data fails explicitly. Campaign HTML is delivered as an authenticated downloadable file.

## Boundaries

No SMS, WhatsApp, general webhook subscription, or automation-building tools are claimed by this email surface. The per-import callback is a completion notification, not a general event system. Account creation, Client Manager administration, integrations access credentials, legacy SOAP APIs, and specialist reports remain outside this package.
