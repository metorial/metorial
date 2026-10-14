# ZenRows Specification

## Authentication

Connect with a ZenRows API key. Fetch requests use the `apikey` query parameter;
subscription usage and domain discovery use the `X-API-Key` header. No OAuth token
exchange or refresh is required. There are no required connection settings.

## Tools

- `scrape_url`: Fetch a public HTTP or HTTPS URL, with JavaScript rendering,
  residential proxies, sessions, CSS selectors, network capture, output filtering,
  Markdown/plaintext/PDF conversion, screenshots, and forwarded custom headers.
  GET, POST, and PUT are supported; POST and PUT forward the request body to the
  target and can change its state. Screenshots and PDFs provide downloadable
  files while preserving the existing text content, status, and header fields.
- `extract_url`: Fetch structured JSON using `extract=auto`, `native`, or
  `standard`, optionally selecting `parsed` fields with comma-separated names or
  dot paths. `standard` currently covers real estate only. Extraction requires a
  prepared domain; use `list_extract_domains` to discover current coverage.
- `list_extract_domains`: Read the domains prepared for extraction, including
  verticals and the provider's `warm` readiness field.
- `get_usage`: Read subscription usage and plan details for the connected key.
- `scrape_amazon`, `scrape_walmart`, `scrape_zillow`, `scrape_idealista`, and
  `search_google`: Existing specialized routes remain available for compatibility.
  Their current provider availability was not verified; use the documented
  Fetch/Extract tools for current general-purpose scraping workflows.

## Fetch Constraints

Session IDs are whole numbers from 1 to 99999. `wait` is a whole number from 0 to
30000 milliseconds. JPEG quality is a whole number from 1 to 100 and requires
`screenshotFormat=jpeg`. The public numeric input types remain numbers.

Screenshots and PDFs require `jsRender=true` and cannot be combined with
`outputs`. Full-page screenshots and element screenshots are mutually exclusive.
Screenshots do not support country targeting. Other country-targeted requests
require premium proxies or adaptive mode. `autoparse` remains supported for
existing callers, although ZenRows recommends Extract for new structured-data
workflows. HTTP requests use a 180-second timeout.

## Provider Documentation

- [Fetch API reference](https://docs.zenrows.com/fetch/api-reference)
- [Authentication](https://docs.zenrows.com/authentication)
- [Extract setup](https://docs.zenrows.com/extract/setup)
- [Extract endpoints](https://docs.zenrows.com/extract/endpoints)
- [Screenshots](https://docs.zenrows.com/fetch/features/screenshot)
- [JSON response](https://docs.zenrows.com/fetch/features/json-response)
- [PDF responses](https://docs.zenrows.com/fetch/features/pdf)
- [Custom headers](https://docs.zenrows.com/fetch/features/headers)
- [Sessions and HTTP methods](https://docs.zenrows.com/fetch/features/other)
- [Wait parameter](https://docs.zenrows.com/fetch/features/wait)
- [Official OpenAPI document](https://www.zenrows.com/openapi.json)
