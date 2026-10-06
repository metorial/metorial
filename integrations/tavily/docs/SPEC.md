# Tavily API coverage

Authentication uses an API key in the Bearer header against the fixed `https://api.tavily.com` origin. Existing `api_key` authentication and optional `projectId` configuration remain supported. `X-Project-ID` is documented on the usage query only; no human identity or token refresh endpoint is invented.

| Tool | Native route | Behavior |
| --- | --- | --- |
| web_search | POST /search | Configurable bounded results; native country names; credits/request ID when supplied |
| extract_content | POST /extract | Up to 20 URLs; explicit successes and failures |
| crawl_website | POST /crawl | Bounded content traversal; chunks require instructions |
| map_website | POST /map | Bounded returned URLs; no native cursor/completeness guarantee |
| research | POST /research, optional GET | Accepted 201 job; bounded wait or immediate receipt; failed reads retain accepted ID |
| get_research | GET /research/{request_id} | Exact-ID 202 pending/in-progress or 200 completed/failed; completed Markdown/JSON download |
| get_usage | GET /usage | API-key counts and cap kept separate from account plan/pay-as-you-go counts |

Content requests may consume credits. Native `usage.credits` is exposed without inventing absent values; zero can reflect batched billing. Missing required usage totals fail rather than becoming zero. Search/extract/crawl/map have request/traversal limits, not cursor pagination. Search `response_time` accepts the documented decimal string example as well as a finite number; nullable optional raw content becomes omitted text.

Research results require matching native request IDs. Pending or failed states are preserved. Completed downloads are bounded to 8 MiB, with JSON for structured content and Markdown for text. No expiry or renewal is claimed for locally generated files. The public specification has no cancellation/deletion endpoint; credits and job/content history remain. No events are registered.

Sources: [OpenAPI](https://docs.tavily.com/documentation/api-reference/openapi.json), [Search](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Extract](https://docs.tavily.com/documentation/api-reference/endpoint/extract), [Crawl](https://docs.tavily.com/documentation/api-reference/endpoint/crawl), [Map](https://docs.tavily.com/documentation/api-reference/endpoint/map), [Research](https://docs.tavily.com/documentation/api-reference/endpoint/research), [Research status](https://docs.tavily.com/documentation/api-reference/endpoint/research-get), [Usage](https://docs.tavily.com/documentation/api-reference/endpoint/usage).

The private billable-content scenarios independently read unscoped native key usage before execution and require a finite key limit above current usage. Project-scoped usage does not establish the global key budget. This preflight does not reserve credits, guarantee a per-request ceiling, or undo concurrent charges. Original authority and bounded complete error/result evidence are rechecked after failed calls as well as successes. Completed report byte comparisons run when direct content is available; deployed upload or URL-only delivery remains separately unverified.
