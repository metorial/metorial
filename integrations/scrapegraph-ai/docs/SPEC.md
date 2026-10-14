# ScrapeGraphAI integration specification

## Authentication and API versions

API keys are sent in the `SGAI-APIKEY` header. The saved API key field and token output are preserved. Legacy v1 tools use `https://api.scrapegraphai.com/v1`; current tools use `https://v2-api.scrapegraphai.com/api`.

Current API keys are available at [scrapegraphai.com](https://scrapegraphai.com). The current API rejects deprecated v1 keys. Use a connection with the credential appropriate to the tools being called. This integration does not silently migrate existing connections or reinterpret legacy tool inputs.

## Current API workflows

- `extract_data`: extract structured JSON from exactly one URL, raw HTML, or Markdown source. Supply a natural language prompt and an optional JSON schema. Raw content is limited to 2 MB. Output includes the request ID, structured result, optional raw model output, usage, and diagnostics.
- `generate_schema`: create or extend an extraction schema from a prompt. An existing schema is sent as `existing_schema`. Output includes the schema and optional refined prompt and token usage.
- `list_history`: inspect request metadata with page/limit pagination and optional service or partial session-ID filters. Output includes request IDs, lifecycle status, account ID, timing, errors, parent IDs, timestamps, and pagination totals.

## Compatibility tools

The existing keys remain: `smart_scrape`, `web_search`, `crawl_website`, `markdownify`, `raw_scrape`, `discover_sitemap`, `agentic_scrape`, `get_credits`, and `get_request_status`. Their input fields, numeric JSON types, and service enum are preserved. HTML and Markdown content values remain unchanged when returned; these outputs also allow null or absent content while a legacy request has no result available.

The provider labels v1 deprecated and documents no v2 equivalent for agentic browser steps or sitemap discovery. Those legacy tools remain subject to provider availability. The legacy crawl endpoint and field documentation are inconsistent, so the existing `/crawl` path and nested rule mapping are retained. The public `outputSchema` input is sent as `data_schema`, as confirmed by the official legacy Python SDK. Request status lookups keep the legacy service enum and URL-encode request IDs. Falsy results are preserved when choosing the returned result field.

Invalid source combinations, empty prompts/credentials/browser steps, and invalid whole-number options fail with actionable validation messages. Search result counts remain between 3 and 20. The API does not document a current-user/profile endpoint suitable for a dedicated identity tool. No trigger changes are included.

## Official references

- [Current API introduction and authentication](https://docs.scrapegraphai.com/api-reference/introduction)
- [Current extraction request and response](https://docs.scrapegraphai.com/api-reference/endpoint/extract)
- [Schema generation](https://docs.scrapegraphai.com/services/schema)
- [History and pagination](https://docs.scrapegraphai.com/api-reference/endpoint/history)
- [Current API errors and deprecated keys](https://docs.scrapegraphai.com/api-reference/errors)
- [Legacy API reference](https://docs.scrapegraphai.com/v1/api-reference/introduction)
- [Legacy SmartScraper](https://docs.scrapegraphai.com/v1/smartscraper)
- [Legacy SearchScraper](https://docs.scrapegraphai.com/v1/searchscraper)
- [Legacy Markdownify](https://docs.scrapegraphai.com/v1/markdownify)
- [Legacy SmartCrawler](https://docs.scrapegraphai.com/v1/smartcrawler)
- [Legacy Python SDK v1.47.0 client](https://github.com/ScrapeGraphAI/scrapegraph-py/blob/v1.47.0/scrapegraph-py/scrapegraph_py/client.py)
- [Legacy AgenticScraper](https://docs.scrapegraphai.com/v1/agenticscraper)
