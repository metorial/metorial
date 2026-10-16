# Screenshot.fyi

## API contract

The [official OpenAPI documentation](https://www.screenshot.fyi/api-docs) defines
one operation: `GET https://screenshot.fyi/api/take`. Authentication uses the
`accessKey` query parameter. The target `url` is required; optional query
parameters are `width`, `height`, `fullPage`, `format`, `disableCookieBanners`,
and `darkMode`. Viewport dimensions are whole numbers. Provider defaults are
1440 by 900 pixels, `fullPage=false`, `format=jpg`,
`disableCookieBanners=true`, and `darkMode=false`.

The integration preserves omitted options so the provider applies its defaults.
It returns the documented JSON response's `url` as `screenshotUrl`, retaining
the existing public field name. Invalid or missing response URLs cause a clear
error. The API key is never included in public results or forwarded to the
image host.

## Generated image

The OpenAPI describes `url` as a presigned download URL and illustrates the host
`blob.screenshot.fyi`. After capture, the integration downloads the actual image
once from that exact HTTPS host, without account credentials or redirects,
validates PNG/JPEG bytes, and prepares the file for download. Scoped file
signatures remain intact in the original URL; account API keys are rejected.

The [privacy policy](https://www.screenshot.fyi/privacy-policy) describes temporary
image caching, while [pricing](https://www.screenshot.fyi/#pricing) advertises
storage. No exact URL lifetime or retrieval-only renewal operation is documented.
The integration does not invent an expiry or repeat a capture to renew a link.
Capture consumes screenshot allowance. If image retrieval or download preparation
fails during the call after capture succeeds, `screenshotUrl` is retained with an
optional `deliveryWarning`; the tool does not automatically retry the capture.
Later file delivery can fail separately.

## Capability boundaries

All documented capture options are exposed. The published OpenAPI has no
profile, account, usage, list, stored-image retrieval, deletion, webhook, or event
operations. No guessed endpoints are registered.
