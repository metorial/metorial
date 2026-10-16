# ElevenLabs Audio

Generate downloadable speech and sound effects, transcribe audio, design and save voices, remove background noise, and manage automatic dubbing through the ElevenLabs API.

The connection retains the historical `elevenreader` identifier. ElevenReader is a separate reading and listening product; these tools do not access its books, imported documents, or personal library.

## Connect

Create an [ElevenLabs API key](https://elevenlabs.io/app/developers/api-keys). The key must allow the API operations you plan to use, including user information for connection verification. Existing saved API-key connections remain supported.

## Workflows

- Discover a voice with `list_voices`, inspect compatible models with `list_models`, then generate downloadable audio with `generate_speech`.
- Generate previews with `design_voice_previews`, save the selected ID with `create_voice_from_preview`, and use the returned saved voice ID for speech.
- Transcribe one audio file or HTTPS cloud-storage URL with `speech_to_text`.
- Create an automatic dub with `create_dubbing`, poll `get_dubbing`, then use `download_dubbing_audio`. Downloads contain the original automatic result, including video when applicable; Dubbing Studio edits require a different API.
- Use `list_history` and `download_history_audio` to retrieve retained audio. History excludes music and sound-effect generations.

`text_to_speech`, `generate_sound_effect`, `isolate_audio`, and `design_voice` remain available for existing callers and retain their original inline audio outputs. Their descriptions identify the download-focused replacements.

ElevenLabs API key permissions, quotas, supported models and formats, and account entitlements apply. See the [API documentation](https://elevenlabs.io/docs/api-reference/introduction).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
