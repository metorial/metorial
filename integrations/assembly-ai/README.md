# <img src="https://provider-logos.metorial-cdn.com/assembly-ai.png" height="20"> Assembly Ai

Transcribe pre-recorded and live audio/video to text with support for 99+ languages, speaker diarization, and multichannel audio. Apply audio intelligence models to extract summaries, sentiment analysis, entity detection, topic detection, key phrases, and content moderation from transcripts. Redact personally identifiable information from text and audio. Generate SRT/VTT subtitles and segment transcripts into paragraphs, sentences, or auto-chapters. Stream real-time speech-to-text via WebSocket connections. Upload audio/video files for processing. Manage and delete transcripts. Access an LLM gateway to apply large language models (Claude, GPT, Gemini) to transcribed speech data for summarization, Q&A, and custom analysis. Translate transcripts across 99+ languages. Receive webhook notifications when transcriptions complete or fail.

## Tools

### Create Streaming Token

Generate a temporary authentication token for use with AssemblyAI's real-time streaming speech-to-text WebSocket API. Use this to securely authenticate client-side streaming without exposing your main API key. Each token is single-use and valid for one streaming session.

### Delete Transcript

Delete a transcript by removing its data and marking it as deleted. The transcript resource itself remains but its data is permanently removed. Any files uploaded via the upload endpoint are also immediately deleted alongside the transcript.

### Get Redacted Audio

Retrieve the URL for a PII-redacted audio file. The original transcription must have been submitted with PII audio redaction enabled (\

### Get Subtitles

Export a completed transcript as SRT or VTT subtitle format for use with video players for subtitles and closed captions. Optionally limit the number of characters per caption line.

### Get Transcript Text

Retrieve a completed transcript's text segmented into sentences or paragraphs. The API semantically segments the text for more reader-friendly output. Choose "sentences" or "paragraphs" segmentation depending on how granular you need the output.

### Get Transcript

Retrieve a transcript by its ID. Returns the full transcript object including text, words with timestamps, speaker labels, and any enabled audio intelligence results (summary, sentiment, entities, topics, chapters, content safety, key phrases). Use this to poll for completion after submitting a transcription, or to retrieve results of a completed transcript.

### LeMUR Task

Apply a large language model to one or more transcripts using AssemblyAI's LeMUR framework. Submit a custom prompt along with transcript IDs or raw text input, and receive an LLM-generated response. Use this for summarizing transcripts, extracting insights, answering questions about audio content, generating action items, or any custom analysis task. Supports multiple LLM providers including Claude, GPT, and Gemini models.

### List Transcripts

List transcripts with pagination and optional filters. Returns transcript summaries sorted from newest to oldest. Supports filtering by status and creation date, and cursor-based pagination using before/after IDs.

### Search Transcript

Search through a completed transcript for specific keywords. You can search for individual words, numbers, or phrases of up to five words. Returns match counts and timestamps for each keyword found.

### Submit Transcription

Submit an audio or video file for asynchronous transcription. Provide a publicly accessible URL to the media file. Optionally enable audio intelligence features like summarization, sentiment analysis, entity detection, topic detection, content moderation, key phrases, auto chapters, and PII redaction. Returns the transcript object with a status of "queued" — poll using the **Get Transcript** tool to check for completion.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
