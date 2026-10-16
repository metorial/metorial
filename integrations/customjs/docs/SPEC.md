# CustomJS integration

CustomJS runs code and document/browser workflows through HTTP APIs. This integration offers 13 tools and uses an API key from [the CustomJS dashboard](https://app.customjs.space).

## Authentication and account

Requests use `x-api-key`. Inline execution retains the documented `__js1-{api_key}` route. Connection validation and `get_account` use the [account verification endpoint](https://www.customjs.space/api/docs/). Account output includes only workspace, owner, allowance, and creation details; API keys, API-key records, and JWT credentials are excluded. Connection configuration is empty.

## Code execution

- `execute_javascript` sends code and an optional string input to the inline execution API. JSON and text results retain their original result field. Binary results also produce a download.
- `execute_stored_function` calls a saved Script ID with a JSON object. Obtain the ID from the Code Editor after saving a function. Its configured response type determines the result format; request a download when the function returns binary content.
- `execute_python` remains available as a legacy action. The current [native execution reference](https://www.customjs.space/integration/native-api/inline-vs-stored/) documents JavaScript only, so it does not establish Python availability or a Python route.

## Documents and images

- `generate_pdf` supports HTML, template data, and page dimensions through [HTML to PDF](https://www.customjs.space/integration/pdf-api/html-to-pdf/).
- `generate_image` supports HTML-to-PNG and [website screenshots](https://www.customjs.space/screenshot-api/), including browser commands and cropping.
- `convert_document` supports [Markdown-to-PDF](https://www.customjs.space/blog/markdown-to-pdf/), Markdown-to-HTML, and HTML-to-DOCX.
- `manipulate_pdf` merges, extracts pages, compresses, converts to text or PNG, reads form fields, and fills forms. The current [PDF API references](https://www.customjs.space/integration/pdf-api/) document the merge/extract/compress/text/PNG utility contracts, including public URL sources.

File results are downloadable. Existing base64, HTML, text, and raw result fields remain available for compatibility. Legacy form-field, HTML-to-DOCX, and Markdown-to-HTML helper contracts are not described in the current public reference and remain unverified.

## Browsing and hosted pages

- `scrape_website` retains the legacy scraper route and raw HTML result. Its older command variants remain accepted; the current API index lists this route without documenting its request shape.
- `extract_web_data` uses the current [browser agent API](https://www.customjs.space/web-scraping-api/). Describe a data collection goal and choose extracted data, text, HTML, or Markdown. The complete response retains browser events and usage. This tool can interact with pages as part of the requested task.
- `manage_pages` lists, retrieves, creates or updates by name, explicitly updates by page ID, and deletes pages. The [Pages reference](https://www.customjs.space/integration/native-api/html-pages/) documents list, create, and update. Upsert matches the name in the page list, updates an existing page, or creates a new one. Custom slugs are documented for creation; existing get/delete routes and slug forwarding during updates are retained for compatibility without fresh provider verification.

## Data utilities and SSL

`process_data` supports JSONPath and regular expression extract/replace/test/split operations. Empty regex text and patterns are valid. Global extraction advances safely after zero-width matches. `check_ssl` retrieves certificate details through the retained certificate utility. These older helper-level request contracts are not specified in the current native API reference.

## Verification boundary

No platform triggers are registered. Form submission and mail forwarding products are not exposed by this integration. Local builds and schema inspection do not establish live provider acceptance, downloadable-file integrity, or availability of retained legacy helpers.
