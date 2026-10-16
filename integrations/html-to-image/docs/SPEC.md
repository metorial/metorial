# HTML to Image

HTML/CSS to Image renders HTML/CSS, webpage screenshots, and saved templates. Authentication uses HTTP Basic with an API ID and secret API key; the base URL is `https://hcti.io/v1`.

The integration exposes image generation, template rendering, paginated image history, deletion requests, existing-image downloads, template creation/update/listing/version discovery, and usage history. Generation returns downloadable results plus the original URL fields. URLs remain hosted while the account is active and the image exists. Delivery failures after generation return a warning so callers can retrieve the existing image without repeating a paid render.

Image listing uses `GET /images`, `count`, and `page_token`. Existing `page` inputs follow cursors; prefer `pageToken` for subsequent requests. Template listing uses the `data` envelope and provider pagination metadata. Optional scalar metadata remains omitted when the provider returns null; raw metadata retains those nulls.

`request_image_deletion` returns the IDs submitted and request acceptance. It does not report completed deletion counts or poll for completion. The deprecated `delete_images` tool retains its baseline schemas and handler, including its historical unverified completion claims. Template rendering requires an explicitly provided `templateValues` object at runtime; the public optional schema is preserved for compatibility, and omission fails before transport.

Usage history reports overlapping hourly/daily/monthly series and billing periods. It does not expose allowance, overage settings, or batch limits. No suitable REST profile endpoint or event subscription is documented.

References: [API](https://docs.htmlcsstoimage.com/getting-started/using-the-api/), [templates](https://docs.htmlcsstoimage.com/getting-started/templates/), [template pagination](https://docs.htmlcsstoimage.com/integrations/mcp/tools/), [API keys](https://docs.htmlcsstoimage.com/getting-started/using-the-api/api-keys/), [usage](https://docs.htmlcsstoimage.com/management-api/usage/).
