# <img src="https://provider-logos.metorial-cdn.com/elevenlabs.png" height="20"> Elevenlabs

Convert text to lifelike speech with customizable voices, intonation, and emotional awareness across 70+ languages. Transcribe speech to text with real-time streaming or batch processing. Clone, generate, and manage voices. Generate music, sound effects, and multi-speaker dialogue from text descriptions. Dub and translate audio/video content into other languages. Deploy and manage conversational voice agents with phone integration, knowledge bases, and analytics. Isolate vocals from background noise, align text to audio timestamps, and remix voice characteristics. Manage pronunciation dictionaries, access generation history, and retrieve usage statistics. Supports webhook notifications for call completions, transcription results, and voice events.

## Tools

### Compose Music

Generate music from a text prompt describing genre, mood, style, and optionally lyrics. Returns base64-encoded audio. This is a batch operation and may take longer for longer compositions.

### Create Dubbing

Start a dubbing job to translate and voice-over audio/video content into another language. Provide a source URL and target language to begin. Returns the dubbing project ID for tracking progress.

### Delete Voice

Permanently delete a voice by its ID. Only voices you own can be deleted. This action cannot be undone.

### Edit Voice Settings

Update the default settings for a specific voice. These settings control how the voice sounds during text-to-speech generation and can be overridden per request.

### Generate Sound Effect

Create sound effects from text descriptions. Describe the desired sound using natural language or audio terminology to generate cinematic sound effects, Foley, ambient sounds, and more. Returns base64-encoded audio.

### Get Account

Retrieve current user profile and subscription details including character usage, voice slots, billing period, and plan tier.

### Get Dubbing

Check the status and details of a dubbing project. Use this to monitor progress of a dubbing job created with the "Create Dubbing" tool.

### Get Voice

Retrieve detailed metadata and settings for a specific voice by its ID. Includes voice properties, labels, and current settings like stability and similarity.

### Isolate Audio

Remove background noise from audio and isolate vocal tracks. Takes a base64-encoded audio file and returns cleaned audio with background noise, music, and ambient sounds removed.

### List History

Browse your text-to-speech generation history. Returns metadata about past generations including the text, voice, model used, and timestamps. Use pagination to navigate through older items.

### List Models

List all available ElevenLabs AI models with their capabilities. Use this to find the right model ID for text-to-speech, voice conversion, or other operations.

### List Voices

Search and browse available voices with filtering, sorting, and pagination. Returns voice metadata including IDs needed for text-to-speech and other voice operations.

### Speech to Text

Transcribe audio into text with high accuracy. Supports speaker diarization, word-level timestamps, and 99+ languages. Provide audio as a base64-encoded file or a publicly accessible cloud storage URL.

### Text to Speech

Convert text into lifelike speech audio using ElevenLabs voices and models. Returns base64-encoded audio that can be saved or played back. Supports multiple languages, voice customization, and various output formats.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
