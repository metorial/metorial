# Passcreator Integration Specification

## Authentication

Create an API key in **Settings → API Keys**. Every request to `https://app.passcreator.com` sends the key directly in the `Authorization` header, without a Bearer prefix. Keys use the account permissions; there is no OAuth refresh flow or additional connection configuration.

## Tools

- Templates: list, describe, create, patch, copy, publish, delete, and discover exact required/optional personalization field keys.
- Passes: create, get, list/search, patch, void/unvoid, move between compatible templates, and delete.
- Bulk operations: target a nonempty filter and track progress plus individual failures using `get_process`.
- Distribution: email delivery, automatic email/SMS during creation, push notifications, scheduled template notifications, and notification list/cancellation.
- Bundles: create, update, read, void/unvoid, and delete bundles containing at most ten passes.
- Validation: list/read app configurations, paginate scan history, and create scans.
- Statistics: usage timelines and raw daily active/inactive history.

The integration registers 22 tools and no triggers. It preserves provider records for pass/template details, personalization fields, statistics, and process errors. `list_passes` returns `nextPageUrl` for both V1 and V3 pagination; pass queries use URL-safe Base64 encoding. Scan listings expose `nextStart` and `totalCount`.

Existing pass URI fields remain available. When Passcreator returns an `iPhoneUri`, creating or retrieving a pass also provides a downloadable `.pkpass` file. Google Wallet links open the provider save flow.

Template creation retains the existing typed input contract. Field definitions default to the documented `text` type and optionally accept number, currency, date, or dateTime. Advanced template properties remain available through the existing `additionalProperties` record, which merges top-level provider template settings.

## Provider documentation

- [API overview](https://developer.passcreator.com/en)
- [Authentication and API keys](https://www.passcreator.com/en/docs/integrations/api/api-keys)
- [V1 templates and notification lifecycle](https://developer.passcreator.com/en/api/v1/pass-template)
- [V2 templates](https://developer.passcreator.com/en/api/v2/pass-template)
- [V1 pass operations, file URIs, and statistics](https://developer.passcreator.com/en/api/v1/pass)
- [V3 passes and bulk operations](https://developer.passcreator.com/en/api/v3/pass)
- [Bulk process tracking](https://developer.passcreator.com/en/api/v3/process)
- [Pass bundles](https://developer.passcreator.com/en/api/v2/pass-bundle)
- [Validation and scan history](https://developer.passcreator.com/en/api/v1/validate-passes)

## Boundaries

The published API reference has no current-user/account identity endpoint. Identity discovery is therefore unavailable. Webhooks, pull-mode webhook payloads, account administration, and specialized boarding-pass/NFC functionality are not exposed as new tools. No provider calls, live E2E suites, or tool-use evals were performed for this refresh.
