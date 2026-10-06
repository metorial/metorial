# HeyGen API capability guide

## Authentication

API keys use `X-Api-Key`; OAuth tokens use `Authorization: Bearer`. Both authentication methods and `get_current_user` resolve identity through `GET /v3/users/me`. OAuth uses authorization codes with PKCE and the authorization/token endpoints advertised by [HeyGen's public OAuth discovery metadata](https://mcp.heygen.com/.well-known/oauth-authorization-server). Exchange and refresh use the same token endpoint with form-encoded requests; refresh preserves the prior refresh token when renewal omits a replacement. App registration, approval, and live OAuth verification remain account dependent.

No account IDs or duplicate credential fields are required at connection setup. For asset listing, the integration discovers the current user's username automatically.

## Covered workflows

| Capability | Tools | Provider API |
| --- | --- | --- |
| Account identity and billing | `get_current_user`, `get_remaining_quota` | `GET /v3/users/me` |
| Avatar and photo-avatar discovery | `list_avatars`, `list_talking_photos` | `GET /v3/avatars/looks` |
| Voice discovery | `list_voices` | `GET /v3/voices` |
| Avatar and multi-scene generation | `create_avatar_video` | `POST /v3/videos` (`avatar` or `studio`) |
| Video status, list, delete | `get_video_status`, `list_videos`, `delete_video` | `/v3/videos` |
| Prompt generation and polling | `create_video_from_prompt`, `get_video_agent_status` | `/v3/video-agents` |
| Template discovery and rendering | `list_templates`, `get_template`, `generate_from_template` | `/v3/templates` |
| Translation-language discovery | `list_translation_languages` | `GET /v3/video-translations/languages` |
| Translation creation, status, list, delete | `translate_video`, `get_translation_status`, `list_translations`, `delete_translation` | `/v3/video-translations` |
| Speech synthesis | `generate_speech` | `POST /v3/voices/speech` |
| Asset list, upload, delete | `list_assets`, `upload_asset`, `delete_asset` | `/v3/assets` |
| Legacy interactive streaming token | `create_streaming_token` | `POST /v1/streaming.create_token` |

## Request and response details

Catalog/list tools return one page, `paginationToken`, and `hasMore`. Continue even after an empty filtered assets page when `hasMore` is true. Voice discovery can filter engine, language, gender, and public/private catalog. Avatar discovery returns look IDs suitable for video creation, avatar types, and supported rendering engines.

`create_avatar_video` validates text/audio and background combinations before submitting. Text scene speed must be between 0.5 and 1.5; uploaded audio keeps its recorded speed and emotion. Ordinary scenes use v3; multi-scene v3 Studio currently supports color backgrounds. Set each character's optional `engine` to a value returned in `supportedApiEngines`; the provider uses Avatar IV when omitted. Existing custom layout, dimensions, voice emotion, video backgrounds, multi-scene image/transparent backgrounds, and `test: true` use v2 compatibility. Do not combine these legacy options with `resolution` or rendering-engine selection. Prefer `resolution: "720p"`, `"1080p"`, or `"4k"` for new videos. The provider's [migration timeline](https://developers.heygen.com/endpoint-version-comparison) retires v1/v2 after October 31, 2026.

`create_video_from_prompt` returns `sessionId`, session `status`, and nullable `videoId`. Poll `get_video_agent_status`; use the video ID only when available. A preferred title is included in the prompt because the v3 session-creation schema has no title field.

`generate_from_template` accepts typed variables such as `{ "greeting": { "type": "text", "content": "Hello" } }`. Call `get_template` to inspect the variable schema and defaults. `test: true` uses the correctly addressed legacy `/v2/template/{id}/generate` endpoint.

`translate_video` requires exactly one public `videoUrl` or existing HeyGen `videoId`. An existing ID must resolve to completed downloadable media. Use exact language names returned by `list_translation_languages`. One translation ID is returned per language in `videoTranslateIds`; `videoTranslateId` retains the first ID for compatibility. Each status call reads one language.

Completed video/translation status tools provide downloadable media and subtitles. Signed URLs are renewed by fetching status again on the next download after a conservative refresh interval. Existing URL output fields remain for compatibility. Speech synthesis returns a downloadable audio file; its `title` affects the suggested filename rather than the provider request.

`upload_asset` downloads a public file without sending HeyGen credentials to its origin, enforces a 32 MB download limit, then sends HeyGen's documented multipart `file` upload. The optional `type` describes the expected media type; HeyGen determines the actual file type.

`get_remaining_quota` preserves its credit meaning. It returns null for wallet-only accounts rather than treating a currency balance as credits; `get_current_user` exposes billing details.

## Event handling

This integration does not register video triggers. Poll the status tools for asynchronous results. Provider webhooks remain available outside this tool surface through [HeyGen's webhook API](https://developers.heygen.com/docs/webhooks).

## Deliberate boundaries

Avatar training and consent, voice cloning/design, brand kits/glossaries, proofread editing, batches, lipsync, AI clipping, filler-word removal, HyperFrames, and full LiveAvatar session management are not exposed. These workflows introduce specialized consent, billing, authoring, or separate-product requirements and are outside this focused refresh.

## Official references

- [OpenAPI contract](https://developers.heygen.com/openapi/external-api.json)
- [Endpoint migration and retirement](https://developers.heygen.com/endpoint-version-comparison)
- [API key authentication](https://developers.heygen.com/docs/api-key)
- [OAuth discovery metadata](https://mcp.heygen.com/.well-known/oauth-authorization-server)
- [Current user](https://developers.heygen.com/reference/get-current-user)
- [Create video](https://developers.heygen.com/reference/create-video)
- [Get video](https://developers.heygen.com/reference/get-video)
- [Video Agent session creation](https://developers.heygen.com/reference/create-video-agent-session)
- [Template generation](https://developers.heygen.com/reference/generate-video-from-template)
- [Translation creation](https://developers.heygen.com/reference/create-video-translation)
- [Speech generation](https://developers.heygen.com/reference/generate-speech)
- [Asset upload](https://developers.heygen.com/reference/upload-asset)
- [LiveAvatar](https://developers.heygen.com/live-avatar)
