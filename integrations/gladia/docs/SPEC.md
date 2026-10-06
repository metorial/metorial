# Gladia Integration Specification

Gladia provides pre-recorded and live speech-to-text APIs. This integration uses the current `/v2/pre-recorded` and `/v2/live` endpoints.

## Authentication

Supply a Gladia API key from https://app.gladia.io. Requests authenticate with the `x-gladia-key` header. There is no OAuth refresh flow, connection resource ID, or documented account/profile endpoint.

## Tools

| Tool | Provider operation | Capability |
| --- | --- | --- |
| `upload_audio` | `POST /v2/upload` | Copy a publicly accessible audio/video URL to Gladia and inspect media metadata. |
| `transcribe_audio` | `POST /v2/pre-recorded` | Submit a transcription, optionally wait for completion, and configure supported audio intelligence. |
| `get_transcription` | `GET /v2/pre-recorded/{id}` | Read status, transcript, timestamps, and enabled intelligence; provide generated SRT/VTT files for download. |
| `delete_transcription` | `DELETE /v2/pre-recorded/{id}` | Permanently remove a pre-recorded transcription and its audio. |
| `initiate_live_session` | `POST /v2/live?region=...` | Create a session with matching encoding settings; stream audio through the returned WebSocket URL using an external client. |
| `get_live_session_result` | `GET /v2/live/{id}` | Read live status, transcript, translation, summaries, entities, and sentiment. |
| `list_transcriptions` | `GET /v2/pre-recorded` or `GET /v2/live` | Discover job IDs and metadata using offset pagination, status, and creation-date filters. |
| `delete_live_session` | `DELETE /v2/live/{id}` | Remove a live transcription and recorded audio after streaming ends. |

## Supported configuration

Pre-recorded transcription supports language detection/code switching, diarization, translation, summarization, named entities, sentiment, custom vocabulary, custom spelling, transcript prompts, sentence segmentation, subtitle generation, and per-job POST callbacks. Custom spelling is submitted as a `spelling_dictionary`. Callback URLs enable `callback` and populate `callback_config`.

Live region is a query parameter (`eu-west` or `us-west`). Live audio supports PCM at 8/16/24/32 bits and A-law or mu-law at 8 bits, the documented sample rates, and 1-8 channels. The callback API supports POST only. Streaming is performed by the client connected to the returned WebSocket URL; these tools do not stream microphone audio themselves.

Existing options for chapterization, moderation, name consistency, and structured data extraction remain in the input contract but cannot be enabled because the current request API does not support them. Use transcript prompts or spelling corrections for those workflows. Callers can retrieve status with `get_transcription` or configure their own provider callback.

## Provider documentation

- [Authentication](https://docs.gladia.io/api-reference/authentication)
- [Current OpenAPI contract](https://api.gladia.io/openapi.json)
- [Pre-recorded initiation](https://docs.gladia.io/api-reference/v2/pre-recorded/init)
- [Pre-recorded results](https://docs.gladia.io/api-reference/v2/pre-recorded/get)
- [Pre-recorded list](https://docs.gladia.io/api-reference/v2/pre-recorded/list)
- [Live initiation](https://docs.gladia.io/api-reference/v2/live/init)
- [Live results](https://docs.gladia.io/api-reference/v2/live/get)
- [Live deletion](https://docs.gladia.io/api-reference/v2/live/delete)
- [File upload](https://docs.gladia.io/api-reference/v2/upload/audio-file)
