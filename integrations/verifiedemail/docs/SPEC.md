# VerifiedEmail API coverage

Official reference: https://developer.verified.email/ and its embedded OpenAPI contract at https://developer.verified.email/swagger-ui-init.js.

## Authentication

Bearer API key generated at https://app.verified.email/apikeys. API key permissions govern individual endpoint access. No OAuth or account identity endpoint is documented.

## Supported documented operations

- `verify_email`: `GET /v1/verifications?email=...`, unwrapping `verifications`. The provider returns `result`, `score`, nullable flags, role/alias/canonical information, and timestamps. Compatibility names `status`, `subStatus`, and `deliverabilityScore` reflect the documented result and score.
- `check_credits`: `GET /v1/entitlements`, unwrapping `entitlements.payAsYouGo` and optional `autoVerify`. No total credits-used or account-wide refill status is documented.
- `list_email_lists`: `GET /v1/lists`, unwrapping `lists` and `metadata.count`. Paging translates to zero-based `offset`; the documented limit is 1–10. Sorting options remain provider field names.
- `get_email_list`: `GET /v1/lists/{id}` for asynchronous progress and statistics.
- `create_email_list`: `POST /v1/lists/` with an empty ID, documented emails and the legacy name. The path allows an empty ID; list-name acceptance is not established by the request schema.
- `verify_email_list`: `POST /v1/lists/{id}` with `{ status: "progress" }`. Returned list statistics map total, deliverable, undeliverable, unknown, and duplicate counts where present; the provider does not report a separate risky count.
- `delete_email_list`: `DELETE /v1/lists/{id}`.
- `request_results_download`: `POST /v1/downloads/` with listId and optional documented include categories.
- `get_results_download`: `GET /v1/downloads/{id}`. A completed request's direct secure URL delivers the file. Structured output contains request metadata, without file content or download credentials.

## Compatibility and verification limits

All existing tool keys are retained. Legacy verification/list/credit fields unavailable in the documented provider response are optional, with their existing primitive types preserved. Native list statistics and verification fields provide the available detail without invented scores, timestamps, MX records, or account settings.

`get_list_results`, `list_webhooks`, `manage_webhook`, and `delete_webhook` retain their existing requests. Webhooks are mentioned by the provider's API-key permission schema and product pages, but endpoint methods, payloads, event names, and response envelopes are absent from the public reference. The public contract describes downloadable results rather than the legacy inline-results route. These operations remain unverified, rather than declared unsupported solely due to omission.

Download authentication and expiration are not specified beyond a direct URL; the implementation forwards the provider URL without adding API-key headers or inventing an expiry. Actual download delivery and empty-ID create routes require live verification.
