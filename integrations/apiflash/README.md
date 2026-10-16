# ApiFlash

Capture website screenshots, extract rendered page content, and check API quota with ApiFlash.

## Authentication

Connect an API access key from the [ApiFlash dashboard](https://apiflash.com/dashboard/access_keys). No additional account or workspace configuration is required.

## Tools

| Tool | Result |
| --- | --- |
| `capture_screenshot` | A downloadable JPEG, PNG, or WebP image and its original URL. Optionally extract HTML and text during the same capture. |
| `extract_page_content` | Downloadable screenshot, rendered HTML, and text, plus their original URLs. HTML and text extraction are enabled by default and can be disabled independently. |
| `check_quota` | Current billing-period limit, remaining captures, and reset timestamp. |

Capture options include viewport dimensions, full-page or element capture, CSS/JavaScript injection, headers, cookies, proxies, language, time zone, geolocation, blocking ads/tracking/cookie banners, caching, and export to S3-compatible storage. Use `waitUntilTimeout` to bound the page-load wait to 1–30 seconds; the page is captured when that limit expires even if the load criterion has not been satisfied.

Headers use `Name=value;Other=value`, while cookies use `name=value;other=value`. Pass ordinary values; request encoding is automatic. Existing caller-supplied values are forwarded unchanged.

New successful captures consume quota. Cached and failed captures do not. `fresh: true` bypasses the cache without invalidating an existing cached screenshot. Quota headers on cached captures may be stale; use `check_quota` for current usage. Some capture features depend on the connected account's plan.

See the [API documentation](https://apiflash.com/documentation), [FAQ](https://apiflash.com/faq), and [changelog](https://apiflash.com/changelog).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
