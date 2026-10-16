# AltText.ai API integration

Verified against the [official API reference](https://alttext.ai/apidocs) and its [OpenAPI 1.10.0 source](https://alttext.ai/openapi.yml) on 2026-10-15.

## Authentication and identity

All requests target `https://alttext.ai/api/v1` and use `X-API-Key`. Create a key in [Account > API Keys](https://alttext.ai/account/api_keys). API-key auth has no OAuth refresh or resource-ID configuration. The profile callback and `get_account` use `GET /account`; the account name is the profile name. `notification_email` is a notification destination, not the owner's identity email. Site keys support the normal image API. Full-access key administration is excluded from this integration.

## Endpoint map

| Tool | Request |
| --- | --- |
| `generate_alt_text` | `POST /images` |
| `get_account` | `GET /account` |
| `get_image` | `GET /images/{asset_id}` |
| `list_images` | `GET /images` |
| `search_images` | `GET /images/search` |
| `update_image` | `PUT /images/{asset_id}` |
| `delete_image` | `DELETE /images/{asset_id}` |
| `scrape_page` | `POST /images/page_scrape` |
| `bulk_generate_alt_text` | `POST /images/bulk_create` using multipart CSV upload |

Image generation requires exactly one URL or RFC 4648 base64 value. File size is below 16 MB; the provider checks image dimensions and formats. `image.asset_id`, `tags`, and `metadata` are nested under `image`. `ecomm` supports a required product plus optional brand and color. The historical product-description input now supplies documented `keyword_source` context; when a separate keyword source is also supplied, both texts are joined with a newline (identical values are not duplicated). This context is only used by the provider when explicit keywords are blank.

Writing styles map to `model_name`: Elaborated → `describe-detailed`, Standard → `describe-regular`, Matter-of-fact → `describe-factual`, Concise → `succinct-describe-factual`, and Terse → `describe-terse`. Final Pass uses `gpt_prompt` with the exact `{{AltText}}` macro and a 768-character maximum. Keywords and prompts must be English even for translated output. `lang` accepts comma-separated codes; additional languages consume translation credits. `maxCharacters` stays a number in the public schema and is checked at runtime as an integer from 80 to 500. Keyword arrays accept at most six items; source context is 12–1024 characters. `overwrite` can regenerate existing images and consume credits. Duplicate images otherwise return their existing records.

List and search keep the public `perPage` number and send it as `limit` (1–100). Page numbers are positive integers. Actual `current-page`, `page-items`, `total-count`, and `total-pages` response headers supply pagination; counts are never guessed from a page length. List supports an exact source URL. Search accepts at most 256 characters, detects URLs and exact asset IDs, then falls back to alt-text search.

Updates wrap data under `image`, pass `lang` and `overwrite` as query parameters, and cannot change the source URL. Existing language variants are preserved unless overwrite is true. Deletion returns the provider's deleted record.

Page scraping accepts a public page URL or raw HTML, parses source HTML without executing JavaScript, and queues images asynchronously. Its three-second download/parse limit is controlled by the provider. The tool returns scraped elements, skip reasons, and actual queued count, not final alt text. CSV submission accepts the provider CSV format (at most 100,000 rows) and exposes acceptance, actual row count, row-level errors, and the complete response. Neither tool claims completed generation at submission time.

## Response compatibility

All five original tool keys, input field types, enums, optionalness, and schema constraints are retained. Additions are optional. Existing number inputs remain number schemas; integer requirements are runtime checks.

The following response-only required-to-optional changes preserve the original field types and actual values. Their exact source is [OpenAPI](https://alttext.ai/openapi.yml):

- `generate_alt_text.imageUrl`, `get_image.imageUrl`, `list_images.images[].imageUrl`, `search_images.images[].imageUrl`: `components.schemas.Image.properties.url` explicitly allows null for raw uploads. The optional string is omitted for null; complete `raw.url` remains null.
- `generate_alt_text.lang`, `get_image.lang`, `list_images.images[].lang`, `search_images.images[].lang`: `components.schemas.Image` and each image endpoint's 200 example provide `alt_texts`, not `lang`. A language is returned only if the provider supplies it or exactly one `alt_texts` entry matches the active `alt_text`.
- `generate_alt_text.status`, `get_image.status`, `list_images.images[].status`, `search_images.images[].status`: the same Image schema and examples omit status. No processing status is invented.
- `get_image.keywords`, `get_image.negativeKeywords`, `get_image.updatedAt`: Image schema and `GET /images/{asset_id}` examples omit these fields. Original nullable-array/string types remain intact when supplied.
- `get_account.email` and `get_account.billingPeriodStart`: `components.schemas.Account` and `GET /account` examples omit owner email and billing-period start. Actual legacy values are retained if returned; notification email has its own optional field.
- `get_account.plan` and `get_account.billingPeriodEnd`: `components.schemas.Account.properties.subscription` is described as present only if any; `PUT /account` examples explicitly show `subscription: null`. Values map from `subscription.plan_name` and `subscription.expires_at` when present.

`displayName` maps from account `name`. `creditsUsed` maps from `usage`, and `creditsLimit` maps from `usage_limit`. The Account schema explicitly describes both as credits in the current billing period, with usage_limit including rollover; `creditsRemaining` is their unclamped difference. All original account data is retained in `raw`.

`createdAt` remains a string: the provider's numeric epoch seconds are converted with `String(created_at)` without inventing a date or losing timestamp precision. Raw retains the original numeric value. `altTexts`, tags, metadata, and complete provider records are returned when available. A response lacking the existing required asset ID, alt text, or creation timestamp raises an explicit error rather than fabricating values. The POST `/images` `timeout_secs` contract explicitly permits an accepted record without final alt text after its default 12-second wait. Generation uses one POST and then, only when a real asset ID was returned without alt text, polls `GET /images/{asset_id}` after one-second delays. A single AbortController limits the initial request, all polling requests, and delays to 25 seconds total; its timer is always cleared. No second creation request is sent. If the result is still pending or lookup fails, a service error preserves the accepted `imageAssetId` in both message and structured data, names `get_image` as the recovery tool, and retains any underlying lookup message/status/code. A malformed image read likewise retains any real asset ID in its error. No ID is fabricated when the initial request fails before returning one. The invocation SDK exposes no caller deadline; the 25-second local budget is explicit, while any lower external timeout remains unverified.

HTTP errors preserve status, provider error_code, and nested validation messages through the shared error adapter. Successful HTTP responses containing provider errors are also rejected. No triggers are included: the API documents account/per-operation callbacks but no verifiable webhook signature contract.

## Verification limits

Local build, type, schema, formatting, and diff checks establish static correctness only. No authenticated provider requests, live suites, evals, key administration, webhooks, or completed batch delivery were exercised during this refresh.
