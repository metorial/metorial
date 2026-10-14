# OpenPerplex API specification

## Authentication and configuration

Requests use the provider SDK version 0.3.0 base URL `https://v3.openperplexapi.com` and an API key in the `X-API-Key` header. Configuration is empty; the API key belongs to the authentication method. Empty keys and keys containing line breaks are rejected. No OAuth token refresh or scopes apply.

## Tools and request payloads

| Tool | Method and endpoint | Request |
| --- | --- | --- |
| `web_search` | `GET /search` | Required `query`; optional `date_context`, `location`, `model`, `response_language`, `answer_type`, `search_type`, `return_citations`, `return_sources`, `return_images`, `recency_filter`. |
| `custom_search` | `POST /custom_search` | Required `system_prompt` and `user_prompt`; optional `location`, `model`, `response_language`, `search_type`, `temperature`, `top_p`, `return_sources`, `return_images`, `recency_filter`. |
| `query_url` | `GET /query_from_url` | Required `url` and `query`; optional `model`, `response_language`, `answer_type`. |
| `extract_content` | `GET /get_website_text` or `GET /get_website_markdown` | Required `url`; the tool's existing `format` selects the endpoint and defaults to `text`. |
| `website_screenshot` | `GET /get_website_screenshot` | Required `url`; returns `websiteUrl` and `screenshotUrl`, plus a downloadable image. |

Public input names use camelCase and map to the snake_case request fields above. Existing defaults remain: `gpt-4o-mini`, `us`, response language `auto`, answer type `text`, search type `general`, recency `anytime`, return flags `false`, custom temperature `0.2`, and custom top-p `0.9`.

All existing enum values remain available. The historical SDK documents `gpt-4o-mini`, `gpt-4o`, `o3-mini-high`, and `o3-mini-medium`; the existing `gemini-2.0-flash` value is retained for compatibility but could not be verified against current provider documentation. Country and language fields remain strings. The SDK uses `uk` for the United Kingdom; use that documented code for localized results.

The existing optional custom-search `responseLanguage` field and its request mapping are retained, although this parameter is not described in the provider SDK's custom-search documentation. This omission alone does not establish its removal.

## Response compatibility

Search and URL-query tools retain `llmResponse` and optional numeric `responseTime`. Search tools also retain optional sources and images. The existing `llm_response`/`response`, `text`/`content`, `markdown`/`content`, and `screenshot_url`/`url` compatibility mappings are preserved. Text and Markdown extraction continue returning the actual extracted `content`; screenshot results continue returning the actual provider `screenshotUrl`.

Malformed selected results, missing answer/content fields, and invalid screenshot URLs are reported as service failures instead of successful empty results. Validation applies only to the selected aliases and fields returned by the tool; unused aliases, extra fields, and HTTP MIME labels do not restrict otherwise valid results. URL queries ignore sources and images because they do not return those fields. Empty strings from an explicitly present answer or extracted-content field remain valid. Web page and screenshot URLs must be HTTP or HTTPS. Requests have a bounded timeout and do not follow redirects with API credentials.

The API's streaming endpoints are not exposed by this integration. No account/profile endpoint is established by the available provider SDK, so no identity tool has been invented. There are no triggers.

## Provider evidence and availability

As checked on 2026-10-14, the [official documentation host](https://docs.openperplex.com/introduction), [home page](https://openperplex.com/), and [legacy API host](https://api.openperplex.com/) display domain-parking content. This does not establish the operating status of the different SDK-documented API host `https://v3.openperplexapi.com`. Current endpoint availability, models, native response schemas, and screenshot URL expiration/download behavior remain unverified.

The [provider-maintained Python SDK](https://github.com/YassKhazzan/openperplex_python_library) and [published SDK version 0.3.0](https://pypi.org/project/openperplex/0.3.0/) document the historical capabilities and parameters. The [immutable SDK source](https://github.com/YassKhazzan/openperplex_python_library/blob/cf3ac7d412077794500f7bfb39dd6ecab32a69a3/src/openperplex/openperplex.py) and [2025-02-10 host-change commit](https://github.com/YassKhazzan/openperplex_python_library/commit/cf3ac7d412077794500f7bfb39dd6ecab32a69a3) establish `https://v3.openperplexapi.com` as both clients' default host, `X-API-Key` authentication, request methods and payloads, and JSON response parsing. The SDK does not declare native response-field schemas, and historical source does not prove the hosted API currently operates. The integration corrects the base URL while preserving existing method/path mappings and public contracts; no new provider capabilities were inferred from the parked legacy domains.
