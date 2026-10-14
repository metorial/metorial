# APIpie AI specification

## Authentication and configuration

APIpie accepts an API key through `Authorization: Bearer <API_KEY>` or `x-api-key`. This integration uses the Bearer header. API requests use `https://apipie.ai/v1`; the existing document upload/collection routes use `https://apipie.ai/ragtune`. Connection configuration optionally specifies a default provider and `price`, `perf`, or `perf_avg` routing. No OAuth or duplicate auth/config resource identifier exists.

## Tool requests and responses

| Tool | Request | Response |
| --- | --- | --- |
| `chat_completion` | `POST /v1/chat/completions`; existing generation, search, RAG, integrity, and memory fields, plus optional `user` and `tools_model`. Specific function names in `toolChoice` are encoded as a named-function choice. | First choice text/function calls, completion identity, provider, tokens, cost, and latency. Documented numeric-string costs are normalized to numbers. |
| `analyze_images` | `POST /v1/chat/completions` with text and `image_url` content parts; image URLs or data URLs, optional detail and output token limit. | Visual text, identity, finish reason, provider, tokens, cost, and latency. |
| `generate_image` | `POST /v1/images/generations`; model, prompt, provider, count, dimensions, quality/style, response format, optional source image. | Existing URL/base64/revised-prompt values, model and usage metadata, plus downloadable generated images. |
| `text_to_speech` | `POST /v1/audio/speech`; model, voice, text, format/speed, and optional nested ElevenLabs voice settings. | Existing audio URL and usage fields plus downloadable speech. JSON URL responses and binary audio responses are accepted without text corruption. |
| `create_embeddings` | `POST /v1/embeddings`; model, text/string list, existing `float`/`np` encoding enum, optional dimensions. | Numeric embedding vectors with indexes, model, and token counts. |
| `discover_models` | `GET /v1/models`; existing type/subtype/provider/model/enabled/voices filters. | Existing model fields, with additive voice identifiers/names when listing voices. |
| `web_search` | `POST /v1/search`; query, search provider, locale and count. `POST /v1/scrape`; URL and format. Combined action scrapes top results and preserves per-page failure outcomes. | Search result URL/title/description and scraped title/text/excerpt. |
| `manage_rag` | Existing `POST /ragtune`, `/ragtune/listCollections`, `/ragtune/deleteCollection` requests and fields. | Existing collection names, upload/delete flags, and unmodified raw responses. |
| `get_usage` | `GET /v1/queries/`; optional limit/offset. | Existing per-request ID, timestamp, provider/route, tokens/characters, string cost, latency, IP, and pagination fields. |
| `get_state` | `GET /v1/state`; optional `user` and `app_name` query fields. | Scope, key/application name, saved settings, feature flags, and complete provider response. |
| `update_state` | `POST /v1/state`; partial `settings`, `delete` setting keys, `enable_inline_cli`, `enable_user_states`, and `gui_only`. | Resulting state and complete provider response. Scope switches clear existing settings; dashboard-only mode restricts later API writes. |

Existing tool keys, field types, optionality, meanings, enum values, and file/raw/base64 outputs are preserved. Whole-number checks run during invocation without narrowing existing numeric schemas. HTTP, timeout, upstream, invalid-response, and user validation failures use structured service errors.

## Official sources and documentation limits

- [Chat completions](https://apipie.ai/docs/features/completions)
- [Tools and function calls](https://apipie.ai/docs/features/tools)
- [Search and scraping](https://apipie.ai/docs/features/internetsearch)
- [Image generation](https://apipie.ai/docs/features/images)
- [Speech synthesis](https://apipie.ai/docs/features/voices)
- [Model and voice catalog](https://apipie.ai/docs/features/models)
- [Usage history](https://apipie.ai/docs/features/usage)
- [State management](https://apipie.ai/docs/features/state)
- [Multimodal vision](https://apipie.ai/docs/features/multimodal_vision)
- [Official RAG upload example](https://apipie.ai/blog/understanding-rag-retrieval-augmented-generation-guide)
- [API reference](https://apipie.ai/docs/api)

The linked RAG reference at `https://apipie.ai/docs/features/ragtune` returned 404 during this audit. Its existing list/delete endpoints and response shapes could not be reverified and are preserved. The API reference returned no readable schema content, so the existing embedding endpoint and `np` encoding behavior could not be fully reverified. Numeric embedding output is checked before success. No suitable current-user/profile endpoint was documented, so model discovery remains the existing connection profile probe with a generic connection label.

Generated URL examples do not document expiry timestamps or URL-renewal endpoints. Download URLs are used as returned, and file download/expiration behavior requires provider verification. No live provider calls, E2E suites, or evals were run for this refresh.
