# Linkup integration

Linkup provides web search, page retrieval, asynchronous research, and credit balance APIs at `https://api.linkup.so/v1`. All requests use an API key in the `Authorization: Bearer <key>` header. No OAuth scopes or refresh flow apply.

| Tool | API | Behavior |
| --- | --- | --- |
| `web_search` | `POST /search` | Standard/deep search with sourced answers, text results, or structured JSON. Native image entries appear in additive `imageResults`; `results` retains text entries with content. `raw` preserves the entire provider response and native result ordering. Structured responses also remain intact in `structuredData`, with compatible legacy fields populated. |
| `fetch_webpage` | `POST /fetch` | Page/PDF markdown, optional images, raw content, structured extraction, JavaScript rendering, and standard/pro retrieval. Keeps `content` as an alias of provider `markdown`, and the requested `url`. Image `alt` also populates the existing `description` field. |
| `check_credit_balance` | `GET /credits/balance` | Exposes provider `balance` and the existing `remainingCredits` alias. |
| `create_research` | `POST /research` | Starts research with sourced or structured output and returns a task ID. |
| `get_research` | `GET /research/{id}` | Retrieves task state, output, and failure details. |
| `list_research` | `GET /research` | Lists organization tasks with page, page size, sorting, and pagination metadata. |

Structured schemas must be valid JSON with root type `object`. Fetch extraction instructions require a schema. Date filters use valid YYYY-MM-DD dates after 1970-01-01; a supplied start date precedes the end date. Research callers poll pending/processing tasks, back off between requests, and stop at completed/failed.

The documented API has no current-user/profile endpoint, so there is no identity tool. Batch tasks and closed-beta extraction are outside this integration's current surface. No webhook or event registration API is documented.

## Official references

- [Authentication](https://docs.linkup.so/pages/documentation/platform/authentication)
- [Search](https://docs.linkup.so/pages/documentation/endpoints/search/reference)
- [Structured output](https://docs.linkup.so/pages/documentation/tutorials/structured-output-guide)
- [Fetch](https://docs.linkup.so/pages/documentation/endpoints/fetch/reference)
- [Balance](https://docs.linkup.so/pages/documentation/endpoints/account/balance)
- [Create research](https://docs.linkup.so/pages/documentation/endpoints/research/post)
- [Get research](https://docs.linkup.so/pages/documentation/endpoints/research/get)
- [List research](https://docs.linkup.so/pages/documentation/endpoints/research/list)
- [Research polling](https://docs.linkup.so/pages/documentation/endpoints/research/best-practices)
- [Errors](https://docs.linkup.so/pages/documentation/platform/errors)
