# Rev AI Integration Specification

## Authentication and scope

Uses a Rev AI access token in the `Authorization: Bearer` header. Generate the
access token in the Rev AI dashboard. The integration has no connection config
fields, OAuth scopes, tenant IDs, or token refresh flow. `get_account` discovers
the authenticated email and current USD credit balances. The historical
`balanceSeconds` output remains for compatibility; the provider now returns
zero for that field.

## Supported tools and provider endpoints

| Tool | Capability / endpoint |
| --- | --- |
| `submit_transcription_job` | POST `/speechtotext/v1/jobs`, using `source_config` for media URLs and optional download headers |
| `get_transcription_job` | GET `/speechtotext/v1/jobs/{id}`, including summary and translation progress |
| `list_transcription_jobs` | GET `/speechtotext/v1/jobs`, with `limit` and `starting_after` |
| `list_jobs` | Lists transcription, sentiment, topic, or language-identification jobs with pagination |
| `get_transcript` | Reads plain text or timestamped JSON; optionally reads requested translation and summary |
| `download_captions` | Downloads SRT or VTT from the authenticated captions endpoint; supports requested translations |
| `get_captions` | Deprecated compatibility tool; use `download_captions` |
| `analyze_sentiment` | Submits English text or retrieves an existing sentiment job and completed results |
| `extract_topics` | Submits English text or retrieves an existing topic job, with score filtering |
| `identify_language` | Submits a media URL or retrieves an existing language-identification job and confidences |
| `manage_custom_vocabulary` | Creates, gets, lists, and deletes vocabularies via `/vocabularies` |
| `delete_job` | Permanently deletes a completed job from the selected API |
| `get_account` | GET `/speechtotext/v1/account` |

Transcription, sentiment, topic, and language listings cover jobs submitted in
the last 30 days. `nextStartingAfter` is returned when a page reaches its
requested limit; use it as `startingAfter` on the next call. A final full page
can still be followed by an empty page. Vocabulary listings have a limit but
no provider-documented pagination cursor.

## Transcription options

Media URLs use `source_config.url`; `sourceAuthHeaders` supplies any headers
required to download the media. The provider stores that configuration privately
rather than exposing the deprecated `media_url` field in job responses.

Supported options include language, machine/human transcription, profanity
filtering, punctuation and postprocessing preferences, custom vocabulary,
speaker channels, expected speakers, standard/premium diarization, translation,
summarization, and retention. Diarization maps to `diarization_type` and
`speakers_count`. Translation target codes map to objects in
`translation_config.target_languages`.

`low_cost` remains an input enum value for compatibility, but Rev AI deprecated
it in July 2026. Prefer the default `machine` transcriber. Human transcription
requires English and does not support machine-only removal, channel/count,
diarization type, translation, or summary options. A precompiled vocabulary ID
and inline vocabulary cannot be used together.
Human transcription uses inline vocabulary as a glossary with at most 20
phrases of up to 255 characters each.

Wait for `status: transcribed` before retrieving transcripts or captions.
Translation and summarization can finish after the transcription itself. Poll
`get_transcription_job` until each requested enrichment is `completed` before
retrieving it. Downloaded files use the selected MIME type and authenticated
provider endpoint; output includes only file metadata.

## Text and language analysis

Sentiment and topic analysis accept either new text or an existing job ID,
never both. Both APIs accept English text up to the provider's documented word
limit. Results include sentiment scores or topic relevance, content fragments,
and character positions for plain-text submissions. Failed jobs expose the
provider's failure reason and detail. Language identification accepts a media
URL with optional source authorization headers and returns the top language
and language confidence scores.

Created transcription, text-analysis, and language-identification jobs may
specify `deleteAfterSeconds` (0–2,592,000) as a retention safety net. Jobs can
only be explicitly deleted once processing succeeds or fails.

## Deliberate limits

The integration exposes asynchronous HTTP workflows. Real-time streaming,
local multipart media uploads, and forced alignment are outside the current
tool surface. Legacy job-completion triggers have been removed; poll the job
retrieval tools for status. No replacement callback or polling trigger is
provided.

## Official sources

- [Asynchronous API reference](https://docs.rev.ai/api/asynchronous/reference)
- [Transcription options](https://docs.rev.ai/api/asynchronous/transcribers)
- [Custom vocabulary API reference](https://docs.rev.ai/api/custom-vocabulary/reference)
- [Sentiment API reference](https://docs.rev.ai/api/sentiment-analysis/reference)
- [Topic API reference](https://docs.rev.ai/api/topic-extraction/reference)
- [Language identification API reference](https://docs.rev.ai/api/language-identification/reference)
- [Changelog](https://docs.rev.ai/changelog)
