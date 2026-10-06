# Fal.ai Tool Reference

## Authentication

Connect an API key from the [fal.ai dashboard](https://fal.ai/docs/documentation/getting-started/get-your-api-key). The API uses `Authorization: Key <key_id:key_secret>`. Keys are scoped to their personal or team account. No additional connection configuration is required. Model inference and discovery accept API-scoped keys. `get_account` requires an ADMIN-scoped key, as documented in the [account billing API](https://fal.ai/docs/platform-apis/v1/account/billing); connecting does not require an ADMIN key.

## Tools

| Tool | Behavior |
| --- | --- |
| `search_models` | Search using free text, category, endpoint IDs, or status. Follow `nextCursor` while `hasMore` is true. Set `includeSchema: true` to discover the full OpenAPI input/output contract of an endpoint. |
| `get_model_pricing` | Retrieve current unit prices, billing units, and currencies for 1–50 endpoint IDs. Resolution, duration, and the model's billing rules can affect final charges. |
| `get_account` | Identify the authenticated account by username and read current credit balance/currency. Requires an ADMIN key. |
| `generate_image` | Run synchronous image inference. Supports common parameters plus `additionalParams` for endpoint-specific inputs. Returns image URLs/metadata and downloadable images. |
| `generate_video` | Run synchronous video inference and provide a downloadable video. Numeric `duration` is converted to the string enum used by Kling endpoints; `additionalParams` can override model-specific fields. Prefer asynchronous inference for slow video models. |
| `generate_speech` | Generate downloadable speech. For `fal-ai/f5-tts`, supply `referenceAudioUrl`; `model_type` defaults to `F5-TTS`, and `audio_url` is decoded as a File object. Other models default to the `text` input field; use `textParameter` and `additionalParams` according to their schema. |
| `transcribe_audio` | Run Whisper-compatible transcription or translation, with optional diarization and none/segment/word timestamp chunks. Preserves inferred languages and separate diarization segments. |
| `run_model` | Run an arbitrary model with its documented input object, preserving structured results and providing downloadable files from returned File objects. |
| `submit_queue_request` | Submit asynchronous inference and return request ID plus status/result/cancellation URLs. A gateway ID and queue position are returned only when present. Optionally notify a caller-supplied webhook URL. |
| `check_queue_status` | Poll status/logs/metrics/errors; fetch completed model output and downloadable files with `action: "result"`; request cancellation with `action: "cancel"`. |
| `upload_file` | Download a public input file of up to 90 MiB, upload it through the CDN upload protocol, and return its actual public CDN URL. The basename of `targetPath` is the preferred filename; the CDN assigns the storage location. Files expire after `expiresInSeconds` (default 3600). |

Use endpoint IDs such as `fal-ai/flux/schnell`, not full URLs. All inference schemas are model-specific; unsupported parameters can cause upstream validation errors. Request control operations use the app root even when inference is submitted to a model subpath.

## Generated files and retention

Image, video, speech, generic inference, and completed queue results provide downloadable files. Existing structured URL fields remain available for subsequent operations. URLs work until the underlying media expires according to account settings or an explicitly supplied `fileRetentionSeconds`; deleted media cannot be renewed. Download files before their retention period ends.

Models that return encoded media, including FLUX with `sync_mode: true`, provide a downloadable file and structured file metadata without embedding the media bytes in the output. Provider URL fields are present only when the model returns a hosted URL.

The synchronous API and long video generation may require a long-running call. Use the queue for long inference. `COMPLETED` may include a provider `error` and `errorType`; it does not by itself prove successful inference. Cancellation returns `CANCELLATION_REQUESTED` when accepted, and `cancelled: true` means accepted rather than a guarantee that running inference stopped. Already completed or missing requests cause an upstream error.

## Caller-managed webhooks

No event triggers are exposed. You may set `webhookUrl` on a queue submission to deliver the result to your own server. Your server must implement the [official ED25519 signature and timestamp verification](https://fal.ai/docs/documentation/model-apis/inference/webhooks). Callback delivery and receiver configuration are the caller's responsibility.

## Official API contracts

- [Model discovery and OpenAPI expansion](https://fal.ai/docs/platform-apis/v1/models)
- [Pricing](https://fal.ai/docs/platform-apis/v1/models/pricing)
- [Queue lifecycle, results, errors, and cancellation](https://fal.ai/docs/documentation/model-apis/inference/queue)
- [FLUX schnell image schema](https://fal.ai/models/fal-ai/flux/schnell/api)
- [Kling video schema](https://fal.ai/models/fal-ai/kling-video/v1/standard/text-to-video/api)
- [F5-TTS speech schema](https://fal.ai/models/fal-ai/f5-tts/api)
- [Whisper transcription schema](https://fal.ai/models/fal-ai/whisper/api)
- [Official CDN upload implementation](https://github.com/fal-ai/fal-js/blob/main/libs/client/src/storage.ts)

API key management, custom deployments, dedicated compute management, and broader analytics are not exposed by these tools.
