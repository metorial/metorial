# ApiFlash API specification

## API and authentication

ApiFlash exposes one screenshot API. Captures use `GET https://api.apiflash.com/v1/urltoimage` with URL-encoded query parameters, including the connected API access key as `access_key`. The provider also supports POST form data; these tools retain GET requests. Keys come from the dashboard. There is no OAuth flow, account configuration, pagination, or documented identity endpoint in this API.

## Operations

| Tool | Request | Provider response mapping |
| --- | --- | --- |
| `capture_screenshot` | GET screenshot endpoint with `response_type=json` | `url` → `screenshotUrl`; optional `extracted_html` and `extracted_text` → extracted file URLs. |
| `extract_page_content` | GET screenshot endpoint with `response_type=json`; `extract_html` and `extract_text` default to `true` independently | Screenshot URL and optional HTML/text file URLs. |
| `check_quota` | GET `/v1/urltoimage/quota?access_key=...` | `limit`, `remaining`, and `reset` → quota limit, remaining quota, and reset timestamp in UTC epoch seconds. |

Both capture tools prepare downloadable files from the actual provider-returned URLs. Existing URL outputs remain available. All three tools also retain the complete provider JSON response in `raw`. No URL expiration is inferred from the screenshot cache duration.

## Capture options

- `format`: `jpeg`, `png`, or `webp`; provider default `jpeg`. `quality` ranges from 0 to 100 with default 80 and applies to JPEG/WebP.
- `width` and `height`: provider defaults 1920 and 1080. The documented bounds are 0–16350 pixels with a maximum viewport area of 33177600 pixels. Height is ignored for full-page captures. WebP dimensions after scale factor are limited to 16350 pixels each.
- `full_page`, `scroll_page`, `element`, `element_overlap`, `crop`, `thumbnail_width`, and `scale_factor` control framing. The provider supports scale factors 1 and 2. Element selection and thumbnails are ignored for full-page captures.
- `wait_until`: `dom_loaded`, `page_loaded`, or `network_idle` (default). `wait_until_timeout` is 1–30 seconds, default 30; after the timeout the provider captures the loaded content anyway. `wait_for` waits up to 15 seconds for a selector before failing. `delay` adds 0–10 seconds after page load.
- `css`, `js`, `headers`, `cookies`, `accept_language`, and `user_agent` customize rendering. Headers and cookies use semicolon-separated `name=value` pairs. A proxy uses `host:port` or `user:password@host:port`.
- `latitude`, `longitude`, `accuracy`, `time_zone`, and `ip_location` configure location. IP location requires a custom enterprise plan.
- `transparent` applies to PNG and also requires a transparent page-body background. `no_ads`, `no_tracking`, and `no_cookie_banners` control blocking.
- `fail_on_status` is a comma-separated list of status codes or hyphen-separated ranges.
- `ttl` controls screenshot caching for 0–2592000 seconds (default 86400). `fresh` bypasses cached captures and does not invalidate earlier cached results.
- `extract_html` and `extract_text` add generated-file URLs to JSON capture responses. Screenshot capture exposes these as optional inputs; content extraction enables both by default.
- `s3_endpoint`, `s3_region`, `s3_access_key_id`, `s3_secret_key`, `s3_bucket`, and `s3_key` support export to Amazon S3 or compatible storage.

Existing input schemas retain their types, requiredness, constraints, and absence of client-side defaults. Existing optional values, including empty strings, false, and zero, continue to be forwarded when present. Only the content-extraction tool supplies the original HTML/text defaults.

## Quota and errors

The dedicated quota endpoint supplies current usage. Cached screenshot response headers can describe quota at the original capture time. New successful captures count toward quota; cached and failed captures do not.

The documented request rate is 20 requests/second with a 400-request burst. Repeated identical failed captures are limited to five requests/hour. Documented HTTP failures are 400 (invalid parameters or unavailable target), 401 (invalid/revoked key), 402 (quota exhausted), 403 (plan restriction), 429 (rate limit), and 500 (capture failure). JSON errors can include `error_type` and `error_message`; these details and the HTTP status are retained in normalized failures.

## Product boundaries

Screenshot capture, content extraction, and quota lookup belong to the same API product; no tool categories are needed. No profile/account identity endpoint is documented, so quota lookup is not represented as an identity tool. No triggers or webhooks are registered.

## Official sources

- [API documentation](https://apiflash.com/documentation): access, the complete rendered parameter table, JSON file response, quota endpoint, and errors.
- [FAQ](https://apiflash.com/faq): cached/failed captures do not consume quota, and fresh requests do not invalidate existing cache entries.
- [Changelog](https://apiflash.com/changelog): September 2026 viewport expansion and JSON error fields.
