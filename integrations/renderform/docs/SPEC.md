# RenderForm Integration

Connect with a RenderForm API key from the account's API Keys tab. Authenticated API requests use `X-API-KEY`; there are no setup fields, OAuth flows, or scopes. `get_account_usage` identifies the organization associated with the key and returns its reported usage and subscription information.

## Supported workflows

- `list_templates` and `get_template`: discover templates and their editable properties. Listing supports name, tags, source template, and page/size filters.
- `create_template`, `update_template`, and `delete_template`: manage template metadata. HTML content can be read with `get_template_content` and overwritten with `update_template_content`; these content routes support the `html-editor` only. Updating tags replaces the complete tag set.
- `render_image`: render image/PDF templates or request asynchronous MP4/WebM video rendering. Optional cache, output format, duration, and frame rate settings are forwarded only when supplied. Existing string-valued property data remains supported.
- `take_screenshot` and `capture_pdf`: capture a public web URL. Screenshot dimensions must be whole pixels from 32 to 5000; wait time must be a whole number from 0 to 5000 ms.
- `list_results`, `get_result`, and `delete_result`: browse, inspect, and delete generated results. `get_result` exposes provider status and request metadata, and can retrieve a completed file without repeating the paid generation request. Pagination uses zero-based page numbers and a maximum size of 50.

Generated files are retrieved only from `https://cdn.renderform.io` without account credentials or redirects, with a 30-second retrieval timeout and a 50 MiB limit. PNG, JPEG, WebP, PDF, MP4, and WebM signatures are checked before file preparation. A successful generation request remains successful if file preparation fails; its original request ID, URL, and warning remain available. Prepared content does not prove later download availability.

Video responses with `pending` status and requests using `webhookUrl` are not reported as ready. Check `get_result` until the provider reports `done` or `failed`. The existing screenshot `webhookUrl` input remains forwarded for compatibility, but current screenshot documentation does not establish support for that field.

RenderForm documents deletion of generated files from free accounts after 14 days. No documented retrieval-only renewal endpoint was found, so no automatic renewal or repeat generation is used. Retention for other plans and later download availability remain unverified.

## Sources

[API authentication and errors](https://renderform.io/docs/api/get-started), [OpenAPI reference](https://api.renderform.io/openapi/docs), [rendering](https://renderform.io/docs/api/render-image), [video polling](https://renderform.io/docs/api/render-video), [templates](https://renderform.io/docs/api/modify-templates), [results](https://renderform.io/docs/api/list-results), [account usage](https://renderform.io/docs/api/credits-usage), and [retention](https://renderform.io/ai-info).
