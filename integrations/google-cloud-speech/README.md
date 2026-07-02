# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Cloud Speech

Convert audio to text transcriptions and synthesize natural-sounding speech from text using Google's neural network models. Perform synchronous, asynchronous, and streaming speech-to-text recognition across 125+ languages. Create and manage recognizer configurations for reusable transcription settings. Adapt speech models with custom phrase sets, custom classes, and boost values to improve accuracy for domain-specific vocabulary. Identify distinct speakers via speaker diarization and recognize multi-channel audio. Generate subtitle/caption output in SRT format. Synthesize text or SSML into audio using Standard, WaveNet, Neural2, Studio, and Chirp voice types with configurable pitch, speaking rate, volume, and encoding. Produce long-form audio content asynchronously.

## Tools

### Batch Transcribe Audio

Start an asynchronous batch transcription of one or more audio files stored in Google Cloud Storage. Returns a long-running operation that can be monitored using the Get Operation tool. Suitable for audio files longer than 1 minute (up to 8 hours). Results can be written to a GCS output location or returned inline when the operation completes.

### Get Operation

Check the status and retrieve results of a long-running Speech-to-Text operation. Use this to monitor batch transcription jobs started with the Batch Transcribe Audio tool. Returns the current status, and when complete, the full transcription results or error details.

### List Voices

List available Text-to-Speech voices. Optionally filter by language code to find voices for a specific language. Returns voice names, genders, supported languages, and native sample rates.

### Create Recognizer

Create a named recognizer configuration for Speech-to-Text v2. A recognizer stores default settings like model, language, and recognition features so they don't need to be repeated in every transcription request.

### Synthesize Speech

Convert text or SSML into natural-sounding speech audio using Google Cloud Text-to-Speech. Returns base64-encoded audio data in the requested format. Supports multiple voice types including Standard, WaveNet, Neural2, Studio, and Chirp 3 HD voices. Customize pitch, speaking rate, and volume.

### Transcribe Audio

Transcribe audio to text using Google Cloud Speech-to-Text (synchronous recognition). Supports inline base64-encoded audio or audio files in Google Cloud Storage. Use for audio files up to 1 minute in duration. Configure language, model, punctuation, word-level details, speaker diarization, and speech adaptation hints.

## Notes

- For Speech-to-Text v2 recognizers and inline transcription, `global` is the safest location default. Google documents v2 resource paths as `projects/{project}/locations/{location}`, but the recognizer examples consistently use `locations/global`, and some projects return API errors if a regional location is used for these flows.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
