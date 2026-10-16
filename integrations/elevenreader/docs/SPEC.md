# ElevenLabs Audio Specification

## Product boundary

This package keeps the historical `elevenreader` connection and tool identifiers while implementing ElevenLabs API operations at `https://api.elevenlabs.io`. ElevenReader is a separate reading and listening app. These tools provide no ElevenReader document ingestion, book management, reader-library access, or Reader-specific authentication. Current official public Reader API contracts were not located, so no Reader routes are inferred from ElevenLabs documentation.

## Authentication and configuration

API-key authentication uses the `xi-api-key` header. The `api_key` method accepts and persists the existing `token` string. Connection verification calls `GET /v1/user`; endpoint-restricted keys must permit that call. No OAuth exchange or refresh is used. Configuration has no required fields or opaque resource IDs.

[API authentication](https://elevenlabs.io/docs/api-reference/authentication) documents endpoint permissions and credit limits. User information also exposes the workspace associated with the key.

## Available API areas

| API area | Operations |
| --- | --- |
| Text to Speech and Voices | Generate speech; search, inspect, edit and delete voices; design previews and save a selected voice; list models and pronunciation dictionaries; list and download retained generation history |
| Speech to Text | Synchronous transcription of exactly one file or HTTPS cloud-storage URL, optional language, diarization, word/character timestamps and audio event tags |
| Sound Effects | Generate an audio file from a text prompt with optional duration, influence and looping |
| Audio Isolation | Remove background noise from an audio file |
| Automatic Dubbing | Create a project from a source URL, poll status, download the completed original automatic result, and delete the project |
| Account | Read current user, associated workspace, subscription and usage information |

The dubbing endpoints are currently documented in ElevenLabs' legacy API section. Existing calls are retained. Downloads can be MP3 or MP4 and exclude later Dubbing Studio edits.

## Download behavior and compatibility

The current generation tools return audio metadata and provide downloadable files. History and completed automatic dub downloads use the documented authenticated GET endpoints. These endpoints are stable resource URLs with no documented signed-URL expiry, so no expiry value is invented.

Four earlier tools remain available with their original inputs, outputs and invocation handlers: `text_to_speech`, `generate_sound_effect`, `isolate_audio`, and `design_voice`. Their replacements are `generate_speech`, `generate_sound_effect_file`, `isolate_audio_file`, and `design_voice_previews`. The voice-design preview ID must be saved with `create_voice_from_preview` before use as a regular voice ID.

Existing metadata tools preserve all original field types and required fields. Nullable optional provider summaries are omitted while the complete original JSON is available in the additive `raw` field. Required legacy voice/model names are never fabricated: a response omitting those names fails with an explicit service error. Official voice and model schemas permit omitted names, so that legacy output limitation remains until a separately approved contract change.

## Scope limits

This package does not implement real-time transcription, music, voice cloning uploads, voice conversion, conversational agents, Studio projects, or workspace administration. No webhook or polling triggers are registered. File delivery, provider permissions, actual provider response acceptance and account-specific availability require live verification.

## Official references

- [ElevenReader product](https://elevenreader.io/) and [product distinction](https://elevenlabs.io/docs/help-center/product/distribution-publishing/eleven-reader-publishing/what-is-eleven-labs-and-the-eleven-reader-app)
- [Speech generation](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [sound effects](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert), [audio isolation](https://elevenlabs.io/docs/api-reference/audio-isolation/convert)
- [Voice search](https://elevenlabs.io/docs/api-reference/voices/search), [voice retrieval](https://elevenlabs.io/docs/api-reference/voices/get), [voice edit](https://elevenlabs.io/docs/api-reference/voices/update), [voice deletion](https://elevenlabs.io/docs/api-reference/voices/delete), [voice design](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [save preview](https://elevenlabs.io/docs/api-reference/text-to-voice/create)
- [Create dubbing](https://elevenlabs.io/docs/api-reference/legacy/dubbing/create), [dubbing status](https://elevenlabs.io/docs/api-reference/legacy/dubbing/get), [dubbing download](https://elevenlabs.io/docs/api-reference/legacy/dubbing/audio/get), [dubbing deletion](https://elevenlabs.io/docs/api-reference/legacy/dubbing/delete)
- [History list](https://elevenlabs.io/docs/api-reference/history/list), [history item](https://elevenlabs.io/docs/api-reference/history/get), [history audio](https://elevenlabs.io/docs/api-reference/history/get-audio), [models](https://elevenlabs.io/docs/api-reference/models/list), [dictionaries](https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/list), [user](https://elevenlabs.io/docs/api-reference/user/get)
