# <img src="logo.svg" height="20"> Cloudlayer

Generate PDFs and images from base64 HTML, web URLs, or Nunjucks templates. Use configurable page layouts, headers, footers, authenticated pages, image quality, mobile viewports, and combined URL batches. Jobs run asynchronously by default; set `async: false` to wait for the provider response.

Use `get_account` to identify the connected account and inspect usage. Check progress with `get_job`, then use `retrieve_job_asset` to download the stored result. `list_assets` and `get_asset` support finding and downloading a particular file. Job and asset lists accept `startAfterId` cursors; the legacy `offset` input remains accepted.

## Authentication

Create an API key in the Cloudlayer dashboard. Requests use `X-API-Key`; no workspace configuration is required.

## Provider behavior

[Cloudlayer v2](https://cloudlayer.io/docs/api-overview/) returns JSON job metadata, including when `async: false` is used. Job states are reported exactly as supplied by the provider, typically `pending`, `success`, or `error`. Stored files have pre-authenticated download URLs. Expiry and retention depend on storage configuration and plan. Download metadata is reread after at most 15 minutes as a runtime policy. Recognized S3 Signature V4 URL deadlines cap that time with a 10-second safety margin; expired or imminently expiring links fail explicitly. Rereading metadata does not guarantee that storage issues a new URL. Unknown URL timing uses the runtime policy, which is not a provider lifetime guarantee.

The endpoint-specific [Jobs](https://cloudlayer.io/docs/jobs/) and [Assets](https://cloudlayer.io/docs/assets/) pages document cursor pagination, while the API overview describes recent-item lists without query pagination. Pagination must be verified against your deployment. The job-result download searches up to three asset pages by default (ten maximum) and can continue from a returned cursor. If a provider deployment ignores cursors, use `list_assets` and a known asset ID.

The legacy `get_account_status` tool retains `/getStatus` for existing connections. The current documented account endpoint is exposed separately through `get_account`.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
