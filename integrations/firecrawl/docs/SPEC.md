# Slates Specification for Firecrawl

## Overview

Firecrawl is a web data platform for scraping, crawling, searching, mapping, parsing, monitoring, and extracting data from websites and uploaded files. This integration targets Firecrawl API v2 at `https://api.firecrawl.dev/v2`.

## Authentication

Firecrawl uses API key authentication with a Bearer token:

```http
Authorization: Bearer fc-...
```

The integration exposes one token auth method, `api_key`.

## Practical API Coverage

The tool surface covers the current user-facing Firecrawl v2 workflows:

- Scraping: scrape a URL, retrieve scrape status, interact with the scrape-bound browser session, and stop the interaction session.
- Parsing: upload a base64 file to `/parse` and return parsed content/metadata.
- Crawling: start a crawl, retrieve status, cancel, retrieve errors, preview crawl parameters, and list active crawls.
- Search and mapping: search web/images/news with filters and optional scraping, and map a site to URLs.
- Batch scrape: start, retrieve status, cancel, and retrieve errors for batch scrape jobs.
- Extraction: start extract jobs and retrieve extract status.
- Agent: start, retrieve status, and cancel Firecrawl agent jobs.
- Browser sandbox: create/list/execute/delete browser sessions.
- Monitors: create/list/get/update/delete monitors, run checks, list checks, and get check details.
- Account operations: credit usage, historical credit usage, token usage, historical token usage, queue status, and activity.

Support/debug endpoints, search feedback, and partner-only endpoints are intentionally not exposed.

## Schema Compatibility

Firecrawl's OpenAPI uses string-or-object variants for formats, search sources, monitor targets, and parser options. Tool input schemas keep a top-level `z.object` and avoid top-level union/intersection schemas. Where Firecrawl expects a variant object, tools expose simple enum or optional companion fields and construct the Firecrawl payload at runtime.

Examples:

- `formats: ["json"]` requires `jsonSchema` or `jsonPrompt`.
- `formats: ["question"]` requires `question`.
- `formats: ["highlights"]` requires `highlightsQuery`.
- `includeDomains` and `excludeDomains` are mutually exclusive and validated before calling Firecrawl.
- `interact_with_page` requires exactly one of `code` or `prompt`.

## File Handling

`parse_file` uploads base64 file content to Firecrawl and returns parsed content and metadata in structured output. It does not download or generate files, so no Slate attachment is returned. Future tools that return generated or downloaded file bytes must return those bytes through Slate attachments rather than inline fields.

## Events

Firecrawl webhook triggers are exposed for asynchronous jobs:

- `crawl_events`: crawl started, page, completed, and failed events.
- `batch_scrape_events`: batch scrape started, page, completed, and failed events.
- `extract_events`: extract started, completed, and failed events.
- `agent_events`: agent started, action, completed, failed, and cancelled events.
