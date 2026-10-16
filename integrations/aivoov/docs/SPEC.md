# AiVOOV Specification

## Authentication and API

Connect with an API key from **My Profile → API**. Requests use `X-API-KEY` and the documented `https://aivoov.com/api/v8` base URL. No additional connection configuration is required. API access requires an eligible account plan and character credit.

## Tools

| Tool | API operation | Behavior |
| --- | --- | --- |
| `list_voices` | `GET /voices` | Returns voice IDs, names, and languages. Optional `languageCode` maps to the `language_code` query. |
| `generate_audio` | `POST /create` | Sends aligned URL-encoded voice/text/SSML arrays. Provides a downloadable audio file and preserves the original `audioBase64` and provider `message` fields for existing workflows. |
| `create_transcription` | `POST /speech` | Uploads binary audio as multipart form data with its language, returning the provider job ID, status, and character usage. |
| `get_transcription` | `GET /job` | Looks up `job_id`; pending jobs report status, completed jobs provide downloadable transcript and SRT files, and failed jobs raise the provider failure reason. |

SSML controls accept integers: pitch -50 through 50, speaking rate 20 through 200, and volume -40 through 40. Omitted controls use the provider's `default` value. The API decides the generated format; the file's MIME type and extension are detected from its bytes, with a binary fallback for unrecognized content.

Transcription accepts MP3, WAV, FLAC, and OGG files up to 10 MB. Supply Base64 audio without a data URL prefix, a matching filename, and the spoken language/locale. Job states are `QUEUED`, `IN_PROGRESS`, `FAILED`, and `COMPLETED`. Transcript text and SRT are required only for completed jobs; missing required success fields produce an error.

## Limits and scope

The voice catalog has a 20-call daily limit. Audio generation allows 75 requests per minute and 5,000 per day; transcription submission allows 30 per minute and 1,000 per day. GET endpoints allow 100 requests per minute. Cache the voice catalog and poll jobs reasonably.

Text-to-speech and speech-to-text tools have separate categories. The published API does not document a profile/account endpoint, webhooks, job deletion, or a generated-file GET download URL. Generated files therefore use the actual response content. There is no format selection parameter.

## Official sources

- [Text-to-speech API reference](https://github.com/AiVOOV/aivoov-api)
- [Official Postman collection](https://raw.githubusercontent.com/AiVOOV/aivoov-api/main/AiVOOV%20API.postman_collection.json)
- [Speech-to-text API reference](https://github.com/AiVOOV/aivoov-api/blob/main/speech-to-text-api.md)
- [API access overview](https://aivoov.com/text-to-speech-api)
