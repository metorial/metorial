# Wit.ai API specification

## Authentication and versioning

Use the app's Server Access Token from the Wit.ai console as a bearer token.
Requests include a version date through the `v` parameter (default `20240304`).
This connection uses a static token and does not run an authorization-code or
refresh-token flow. The token determines the app used by inference and training.
App IDs are discovered through `list_apps` and supplied to app-management tools.

## Supported capabilities

| Capability | API surface |
| --- | --- |
| Text understanding | `GET /message`, with N-best results and contextual locale/timezone/reference time |
| Language detection | `GET /language` |
| Apps | `GET/POST /apps`; `GET/PUT/DELETE /apps/:id` |
| Model version tags | `GET/POST /apps/:id/tags`; `DELETE /apps/:id/tags/:name` |
| Intents | `GET/POST /intents`; `GET/DELETE /intents/:name` |
| Entities | `GET/POST /entities`; `GET/PUT/DELETE /entities/:name` |
| Entity keywords and synonyms | Keyword and synonym creation/deletion beneath `/entities/:name/keywords` |
| Traits and values | Trait creation/read/deletion, plus value creation/deletion |
| Training utterances | `GET/POST/DELETE /utterances`, with offset pagination and intent filtering |
| App backup | `GET /export`, yielding a downloadable ZIP |
| Text to speech | `GET /voices` and `POST /synthesize`, yielding downloadable audio |

Text entity results retain provider-specific fields and expose structured resolved
values for numbers and datetime intervals. Existing string values remain available.
App tag lists flatten provider groups while retaining each tag's name, description,
and timestamps. Entity updates retain required current fields and read the saved
configuration back after writing.

## Deliberate limits

The provider SDK also exposes audio understanding, dictation, app import, and
Composer conversations. These are not exposed by this integration. No current-user
profile endpoint is documented in the official SDK; app discovery identifies the
resources accessible to the token. No event or webhook subscription is advertised.

## Official references

- [HTTP API](https://wit.ai/docs/http/20240304/)
- [Official Python SDK](https://github.com/wit-ai/pywit/blob/main/wit/wit.py)
- [Official Node SDK](https://github.com/wit-ai/node-wit/blob/master/lib/wit.js)
- [Meta tag model](https://developers.meta.com/vr/reference/voice/v85/struct_meta_wit_ai_data_info_wit_version_tag_info/)
- [Meta app-information requests](https://developers.meta.com/vr/reference/voice/v66/class_meta_wit_ai_requests_wit_info_v_request/)
