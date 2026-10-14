# AI/ML API Specification

## Authentication and configuration

Authenticate with an AI/ML API key using `Authorization: Bearer <API_KEY>`. The default `baseUrl` is `https://api.aimlapi.com`; endpoint methods append their API version. No OAuth scopes or tenant identifiers are required. `get_current_user` reads `/v2/billing/detail`, whose documented response includes the user ID, email, balance, and currency.

## Registered capabilities

| Tool | Provider endpoint |
| --- | --- |
| `chat_completion` | `POST /v1/chat/completions` |
| `generate_image` | `POST /v1/images/generations` |
| `text_to_speech` | `POST /v1/tts` |
| `speech_to_text` | `POST /v1/stt/create`, followed by `GET /v1/stt/{generation_id}` |
| `generate_embeddings` | `POST /v1/embeddings` |
| `moderate_content` | `POST /v1/chat/completions` |
| `generate_video` | `POST /v2/video/generations`, followed by `GET /v2/video/generations?generation_id=…` |
| `list_models` | `GET /v1/models` |
| `get_current_user` | `GET /v2/billing/detail` |
| `get_video_result` | `GET /v2/video/generations?generation_id=…` |
| `get_transcription_result` | `GET /v1/stt/{generation_id}` |

The existing tools retain their keys, input types, optionality, enums, and output fields. `list_models` additionally accepts optional model ID, endpoint type, tag, modality, and capability filters, plus requested detail sections. New optional model metadata preserves legacy `object` and `ownedBy` values when present. `generate_embeddings` retains numeric vectors and adds `encodedEmbedding` when the provider returns base64.

Generated image, video, and audio files are downloadable. Image generation accepts both documented `data` and legacy/example `images` response arrays. Existing image URL/base64 fallback values, video URLs, and audio URLs remain available. Speech synthesis accepts both the documented string/object audio URL responses and binary audio responses. URL expiration is not specified in the reviewed model documentation; no expiration duration is assumed.

## Model-specific constraints

Model discovery returns aliases and official documentation URLs. Provider-specific inputs remain dependent on the chosen model. The classic Flux IDs `flux/schnell`, `flux/dev`, `flux-pro`, and `flux-pro/v1.1` use `num_images` and `image_size`; the existing image count and size fields map to those documented parameters. `WIDTHxHEIGHT` maps to an image-size object for these models. Other models retain the existing `n` and `size` mappings. Negative prompts, guidance scale, aspect ratio, and prompt enhancement support vary by model.

Moderation maps the existing default model alias `Meta-Llama-Guard-3-8B` to the documented `meta-llama/Meta-Llama-Guard-3-8B` ID. Image moderation requires a compatible vision model. Empty moderation input is rejected.

Video creation accepts the current `id` response and the legacy `generation_id`. Transcription polling recognizes current and legacy pending statuses and reads both legacy `result` and current `output` text, including per-channel transcript alternatives. Failure statuses are reported as service failures. The result tools allow subsequent retrieval after the initial polling window; transcription results are stored for one hour.

The existing `webSearch` input and its `web_search` mapping are retained for compatibility. The reviewed capability page lists supported search models but does not establish that generic parameter for every chat model. Provider-specific search behavior needs live verification.

## Official references

- [Model catalogue](https://docs.aimlapi.com/api-references/service-endpoints/complete-model-list)
- [Account identity and balance](https://docs.aimlapi.com/api-references/service-endpoints/account-balance)
- [Chat completions](https://docs.aimlapi.com/api-references/text-models-llm/openai/gpt-4o)
- [GPT Image 1](https://docs.aimlapi.com/api-references/image-models/openai/gpt-image-1)
- [Flux Dev](https://docs.aimlapi.com/api-references/image-models/flux/flux-dev)
- [Flux Pro](https://docs.aimlapi.com/api-references/image-models/flux/flux-pro)
- [Flux Pro v1.1](https://docs.aimlapi.com/api-references/image-models/flux/flux-pro-v1.1)
- [Flux Schnell](https://docs.aimlapi.com/api-references/image-models/flux/flux-schnell)
- [Text to speech](https://docs.aimlapi.com/api-references/speech-models/text-to-speech/openai/tts-1)
- [Speech to text](https://docs.aimlapi.com/api-references/speech-models/speech-to-text)
- [Current transcription response](https://docs.aimlapi.com/api-references/speech-models/speech-to-text/assembly-ai/universal)
- [Embeddings](https://docs.aimlapi.com/api-references/embedding-models/openai/text-embedding-3-large)
- [Text moderation](https://docs.aimlapi.com/api-references/moderation-safety-models/meta/meta-llama-guard-3-8b)
- [Image moderation](https://docs.aimlapi.com/api-references/moderation-safety-models/meta/llama-guard-3-11b-vision-turbo)
- [MiniMax Video 01](https://docs.aimlapi.com/api-references/video-models/minimax/video-01)
- [Web search capability](https://docs.aimlapi.com/capabilities/web-search)
