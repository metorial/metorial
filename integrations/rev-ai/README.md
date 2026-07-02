# <img src="https://provider-logos.metorial-cdn.com/rev_ai-logo.png" height="20"> Rev Ai

Transcribe audio and video files to text using asynchronous or real-time streaming speech-to-text. Submit media via URL or file upload and retrieve transcripts in JSON, plain text, SRT, or VTT formats. Identify speakers with diarization, translate transcripts to other languages, generate summaries, extract topics, and analyze sentiment. Identify spoken languages in audio, perform forced alignment for precise word-level timestamps, and manage custom vocabularies to improve transcription accuracy. Supports 58+ languages, profanity filtering, verbatim mode, and webhook notifications for job completion.

## Tools

### Analyze Sentiment

Submits text for sentiment analysis and retrieves the results. Analyzes the sentiment of each sentence in the provided transcript, returning scores in [-1, 1] range where below -0.3 is negative, above 0.3 is positive, and in between is neutral. Can submit plain text directly or poll an existing job for results.

### Delete Job

Permanently deletes a completed job and all associated data (media, transcript, results). Supports deleting transcription, sentiment analysis, topic extraction, and language identification jobs.

### Extract Topics

Submits text for topic extraction and retrieves the results. Identifies important keywords and concepts from a transcript, returning a ranked list of topics with relevance scores and supporting content fragments. Can submit plain text directly or poll an existing job for results.

### Get Account

Retrieves account information including the email address and remaining balance in seconds for the authenticated Rev AI account.

### Get Captions

Retrieves captions for a completed transcription job in SubRip (SRT) or Web Video Text Tracks (VTT) format. Useful for generating subtitle files from transcriptions.

### Get Transcript

Retrieves the transcript for a completed transcription job. Supports plain text and JSON output formats. Can also fetch translated transcripts and summaries if they were requested during job submission.

### Get Transcription Job

Retrieves the status and details of a transcription job by its ID. Use this to check whether a job has completed before fetching its transcript.

### Identify Language

Submits audio for language identification and retrieves the results. Identifies the spoken language in audio input and returns confidence scores for each detected language. Can submit a media URL for a new identification or poll an existing job for results.

### List Transcription Jobs

Lists transcription jobs submitted within the last 30 days in reverse chronological order. Supports pagination for retrieving large sets of jobs.

### Manage Custom Vocabulary

Creates, retrieves, lists, or deletes custom vocabularies. Custom vocabularies improve transcription accuracy for domain-specific terms not in the standard dictionary. Once created and compiled, a vocabulary can be referenced by ID in transcription jobs.

### Submit Transcription Job

Submits an audio/video file for asynchronous speech-to-text transcription. Provide a public media URL and configure options such as language, speaker diarization, profanity filtering, translation, and summarization. Returns the created job with its ID and status. Poll the job status or use webhooks to know when it completes.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
