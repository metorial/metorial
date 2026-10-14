# Parsera Specification

Parsera extracts structured data from URLs and supplied HTML or text. Requests use an API key in the `X-API-KEY` header at `https://api.parsera.org/v1`. No account or identity endpoint is documented for this API.

## Extraction

- `extract_data` and `parse_content` accept a prompt or named attributes and return the provider’s extracted records. Attributes support `any`, `string`, `integer`, `number`, `bool`, and `list` output types.
- `extract_markdown` returns the original Markdown string and provides the same text as a downloadable `page.md` file.
- Extraction requests use the canonical `/extractor/extract`, `/extractor/parse`, and `/extractor/extract_markdown` endpoints. The provider also documents the old extraction paths as supported aliases.
- Existing `precision` inputs remain available for compatibility; the current extractor reference lists only `standard`. Current precision behavior requires provider verification.

## Reusable scrapers

- `list_scrapers` returns existing scraper IDs and names, plus type, nullable state, URL, and creation time when supplied by Parsera.
- `get_scraper` uses the typed extractor or agent endpoint and preserves scraper details, including agentic build state and `parameters_schema`.
- `run_scraper` sends `template_id` to the unified execution endpoint and retains its array-of-records output. A provider `202 Accepted` handoff reports the run ID and directs callers to `get_scraper_run`, rather than returning a false empty success.
- `run_scraper_async` starts a run and returns the provider’s `run_id` and status. It accepts optional URLs, named agentic parameters, and a callback URL.
- `get_scraper_run` preserves the provider’s progress, credit usage, per-URL data, and failure details. Callers can poll while work is queued or running.
- Extractor scrapers accept up to 100 URLs per run. Agentic scrapers accept one URL per run. Proxy routing and cookies are ignored for agentic scrapers.
- `create_scraper` and `delete_scraper` retain their existing public keys and legacy scraper routes. The March 2026 changelog confirms legacy CRUD endpoints remain functional but deprecated. The current references omit the existing `/scrapers/generate` contract; its established payload and real confirmation message remain unchanged rather than being replaced with speculative generation behavior. A failure after creation can leave a scraper behind; the invocation progress records its ID for inspection or deletion.

## Official references

- [Extractor API](https://parsera.org/docs/api/extractor)
- [Extractor scraper management](https://parsera.org/docs/api/extractor-scrapers)
- [Agentic scraper management](https://parsera.org/docs/api/agent-scrapers)
- [Scraper execution and polling](https://parsera.org/docs/api/scrapers)
- [Output types](https://parsera.org/docs/api/output-types)
- [March 2026 migration and compatibility](https://parsera.org/docs/api/changelog-march-2026)
- [Cookies](https://parsera.org/docs/api/cookies)

This refresh is verified statically. It does not establish live API acceptance, legacy generation availability, or successful deployed file delivery.
