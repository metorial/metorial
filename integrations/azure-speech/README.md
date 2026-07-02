# <img src="https://provider-logos.metorial-cdn.com/azure-speech.png" height="20"> Azure Speech

Transcribe audio to text using real-time, fast, or batch transcription modes with speaker diarization and language identification. Convert text to synthesized speech using neural, custom, or personal voices with SSML control over pronunciation and prosody. Generate photorealistic avatar videos from text. Translate speech across multiple languages. Verify and identify speakers by voice characteristics. Assess pronunciation accuracy, fluency, completeness, and prosody for language learning. Supports custom speech models trained on domain-specific data and LLM-enhanced transcription for captions, meeting summaries, and call center assistance.

## Tools

### Create Batch Transcription

Submits a batch transcription job to process one or more audio files asynchronously. Ideal for transcribing large volumes of prerecorded audio. Provide audio file URLs or an Azure Blob Storage container URL. The job runs asynchronously — use the **Get Batch Transcription** tool to check status and retrieve results.

### Delete Batch Transcription

Deletes a batch transcription job and its associated result data. Use this to clean up completed transcriptions after retrieving their results, or to cancel transcriptions that are no longer needed.

### Get Batch Transcription

Retrieves the status and details of a batch transcription job. When the transcription is complete, also fetches the result files including transcription output and report. Use this to check progress of a previously submitted batch transcription and to retrieve the final results.

### Identify Speaker

Identifies which speaker from a group of enrolled profiles is speaking in the provided audio. Compares the audio against up to 50 candidate speaker profiles and returns the best match with a confidence score. Uses text-independent identification — the speaker can say anything.

### List Batch Transcriptions

Lists all batch transcription jobs in your Azure Speech resource. Returns summary information for each transcription including status, locale, and timestamps. Supports pagination for large result sets.

### List Speech Models

Lists available base speech-to-text models for all locales, including standard and Whisper models. Use this to discover model IDs for batch transcription.

### List Voices

Retrieves the full list of available text-to-speech voices for the configured Azure Speech region. Use this to discover available voices, their supported languages, speaking styles, and capabilities before synthesizing speech. Results can be filtered by locale or gender.

### Manage Speaker Profile

Creates, retrieves, lists, or deletes speaker recognition profiles. Speaker profiles are used for voice verification (confirming identity) and identification (determining who is speaking). Supports text-independent speaker recognition profiles.

### Recognize Speech

Performs real-time speech-to-text recognition on short audio (up to 60 seconds). Converts spoken audio into text using Azure's speech recognition engine. Optionally includes **pronunciation assessment** to evaluate the accuracy, fluency, completeness, and prosody of spoken audio against a reference text.

### Synthesize Speech

Converts text into natural-sounding synthesized speech audio using Azure neural voices. Provide either plain text (which will be wrapped in SSML automatically) or custom SSML for fine-grained control over pronunciation, prosody, speaking styles, pauses, and other speech characteristics. Returns the synthesized audio as a base64-encoded string.

### Verify Speaker

Verifies whether a speaker matches a previously enrolled voice profile. Compares the provided audio against the enrolled profile and returns a confidence score and accept/reject decision. Uses text-independent verification — the speaker can say anything.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
