# Context.dev specification

## Overview

Provides 40 tools for web data, company intelligence, document parsing, batches, and monitoring through the Context.dev REST API at `https://api.context.dev/v1`. Authentication uses a bearer API key.

## Argument inventory

Objects retain their nested published schemas. Required arguments below describe the root object; additional combinations are checked at invocation time.

| Tool | Required arguments | Optional arguments |
| --- | --- | --- |
| `web_scrape` | `url`, `formats` | `markdownParams`, `screenshotParams`, `imageParams`, `parseParams`, `highlightsParams`, `jsonParams`, `productParams`, `sharedParams`, `maxAgeMs`, `zdr`, `timeoutOpts`, `tags` |
| `web_map` | `domain` | `includeSubdomains`, `maxLinks`, `sitemapUrl`, `urlRegex`, `search`, `headers`, `timeoutOpts`, `zdr`, `tags` |
| `web_crawl` | `url` | `maxPages`, `maxDepth`, `urlRegex`, `includeLinks`, `includeImages`, `shortenBase64Images`, `useMainContentOnly`, `followSubdomains`, `pdf`, `includeFrames`, `includeSelectors`, `excludeSelectors`, `maxAgeMs`, `waitForMs`, `settleAnimations`, `stopAfterMs`, `country`, `timeoutOpts`, `zdr`, `tags` |
| `web_search` | `query` | `numResults`, `includeDomains`, `excludeDomains`, `freshness`, `country`, `queryFanout`, `markdownOptions`, `highlightsOptions`, `timeoutOpts`, `zdr`, `tags` |
| `web_answers` | `task` | `mode`, `json_format`, `timeoutOpts`, `tags`, `zdr` |
| `brand_retrieve_unified` | `body` | None |
| `get_brand` | `domain` | `maxSpeed` |
| `brand_search` | `query` | `autocomplete`, `queryBy`, `typoTolerance`, `tags` |
| `web_styleguide` | None | `domain`, `directUrl`, `maxAgeMs`, `timeoutOpts`, `colorScheme`, `zdr`, `tags` |
| `people_enrich` | None | `social_urls`, `name`, `email`, `company`, `education`, `location`, `timeoutOpts`, `zdr`, `tags` |
| `get_news_search` | `searchBy` | `filterBy`, `sortBy`, `limit`, `cursor`, `tags` |
| `parse_document` | `fileBase64` | `extension`, `includeLinks`, `includeImages`, `shortenBase64Images`, `useMainContentOnly`, `ocr`, `pdf`, `client`, `zdr`, `tags` |
| `submit_batch` | `input` | `Idempotency-Key`, `webhookUrl`, `webhook`, `tags` |
| `list_batches` | None | `limit`, `cursor`, `status`, `q`, `search_type`, `tags` |
| `get_batch` | `batch_id` | None |
| `get_batch_results` | `batch_id` | `limit`, `cursor` |
| `cancel_batch` | `batch_id` | None |
| `delete_batch` | `batch_id` | None |
| `create_monitor` | `name`, `target` | `mode`, `tags`, `change_detection`, `schedule`, `webhook` |
| `list_monitors` | None | `q`, `search_by`, `search_type`, `status`, `target_type`, `change_detection_type`, `tags`, `tag`, `limit`, `cursor` |
| `get_monitor` | `monitor_id` | None |
| `update_monitor` | `monitor_id` | `name`, `tags`, `status`, `target`, `change_detection`, `schedule`, `webhook` |
| `delete_monitor` | `monitor_id` | None |
| `get_monitor_limits` | None | None |
| `list_monitor_credit_usage` | None | `since`, `until` |
| `run_monitor_now` | `monitor_id` | None |
| `list_monitor_runs` | `monitor_id` | `status`, `limit`, `cursor` |
| `get_monitor_run` | `monitor_id`, `run_id` | None |
| `list_account_runs` | None | `status`, `limit`, `cursor` |
| `list_monitor_changes` | `monitor_id` | `tag`, `since`, `until`, `limit`, `cursor` |
| `get_change` | `change_id` | None |
| `list_changes` | None | `monitor_id`, `target_type`, `change_detection_type`, `tag`, `since`, `until`, `limit`, `cursor` |
| `rotate_monitor_webhook_secret` | `monitor_id` | None |
| `list_webhook_deliveries` | `body` | None |
| `get_webhook_delivery` | `delivery_id` | `tags` |
| `list_webhook_delivery_attempts` | `delivery_id` | `limit`, `cursor`, `tags` |
| `retry_webhook_delivery` | `delivery_id` | `Idempotency-Key`, `force`, `tags` |
| `list_logs` | None | `from`, `to`, `path`, `key_id`, `status_code`, `error_code`, `errors_only`, `tags`, `search`, `page`, `limit` |
| `get_log` | `request_id` | None |
| `submit_feedback` | `category`, `note` | `request_id`, `url`, `tags` |

## Request and result semantics

- `web_map` uses `GET /web/urls`. Company news uses `POST /news/search`.
- Brand retrieval uses `POST /brand/retrieve`. `get_brand` supplies a domain lookup and returns a structured `brand` object, including its required color, social, industry, and link arrays.
- Unified brand lookup supports domain, name, email, ticker, direct URL, and transaction identifiers. ISIN lookup is available in company news search.
- `parse_document` sends decoded bytes to `POST /parse` and parsing options as query parameters. The decoded input limit is 25 MiB.
- `Idempotency-Key` is an HTTP header for batch submission and webhook retries. Optional false, zero, and null values retain their documented meaning.
- Results expose resource identifiers, status, cursors, request IDs, credits, and useful content. Partial results and per-item failures remain visible.
- Long-running jobs are inspected with separate status/result tools; submission does not wait indefinitely for completion.
- Screenshot images, original bytes, and batch files are downloadable results; expired or deleted data cannot always be recovered.
- Feedback is an explicit action and is never sent automatically on errors.

## Sources

- [REST OpenAPI specification](https://docs.context.dev/openapi.json)
- [Provider changelog](https://docs.context.dev/changelog)
