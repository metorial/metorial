# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Transcribe

Transcribe speech to text from audio and video files stored in S3. Start and inspect standard, Call Analytics, and medical batch transcription jobs. Automatically identify languages, apply custom vocabularies and language models, filter unwanted words, identify speakers (diarization), and transcribe multi-channel audio. Redact personally identifiable information (PII) from transcripts and Call Analytics source audio. Generate subtitles in WebVTT and SRT formats. Detect toxic speech content. Manage Call Analytics categories, standard vocabularies, vocabulary filters, and medical vocabularies. Monitor transcription job state changes through polling triggers.

## Tools

### Delete Call Analytics Job

Delete a Call Analytics job and its metadata. This does not delete transcript output stored in S3.

### Delete Medical Transcription Job

Delete a medical transcription job and its metadata. This does not delete transcript output stored in S3.

### Delete Transcription Job

Delete a transcription job and its associated metadata. The job must be in a terminal state (COMPLETED or FAILED) to be deleted. This does not delete the transcript output from S3.

### Get Call Analytics Job

Retrieve the status and details of a Call Analytics job including transcript URIs, channel definitions, completion time, and failure reason. Use this to check if a call analytics job has completed and to get the results location.

### Get Medical Transcription Job

Retrieve status and details for a medical transcription job, including transcript URI, specialty, type, and failure details.

### Get Transcription Job

Retrieve the status and details of a transcription job including its transcript output URI, language, settings, and completion time. Use this to check if a job has completed and to get the transcript location.

### List Call Analytics Jobs

List Call Analytics jobs in your AWS account. Filter by job status or job name and paginate through results.

### List Language Models

List custom language models in your AWS account. Filter by status or name to find specific models. Custom language models improve transcription accuracy for specific domains by training on your text data.

### List Medical Transcription Jobs

List medical transcription jobs in your AWS account. Filter by status or job name and paginate through results.

### List Transcription Jobs

List transcription jobs in your AWS account. Filter by status or job name to find specific jobs. Returns summaries with job names, statuses, creation times, and language codes. Supports pagination for large result sets.

### Manage Call Analytics Category

Create, update, get, delete, or list Call Analytics categories. Categories define rule-based labels that AWS applies to Call Analytics jobs created after the category exists.

### Manage Medical Vocabulary

Create, update, get, delete, or list custom medical vocabularies for Amazon Transcribe Medical. Medical vocabularies use a vocabulary table file stored in S3 or an accessible URI.

### Manage Vocabulary Filter

Create, update, get, delete, or list vocabulary filters. Vocabulary filters specify words to remove, mask, or tag in transcripts — commonly used for removing profanity or unwanted words. Provide filter words as a list or via an S3 file.

### Manage Vocabulary

Create, update, get, delete, or list custom vocabularies. Custom vocabularies improve transcription accuracy for domain-specific words like product names, technical terms, or proper nouns. Provide terms as a list of phrases or via an S3 file.

### Start Call Analytics Job

Start a Call Analytics transcription job that processes call center audio to extract insights like sentiment, call categories, characteristics, and AI-powered summaries. Designed for two-channel audio where agent and customer are on separate channels. Can also redact PII from both transcripts and source audio.

### Start Medical Transcription Job

Start a medical transcription job to convert medical speech to text. Incorporates medical terminology for use cases like transcribing doctor-patient dialogue, physician notes, and dictation. Supports speaker diarization and channel identification for multi-party conversations.

### Start Transcription Job

Start a batch transcription job to convert speech from an audio or video file stored in Amazon S3 to text. Supports features like speaker diarization, channel identification, custom vocabularies, PII redaction, subtitle generation, and toxicity detection. The job runs asynchronously; use **Get Transcription Job** to check status and retrieve results.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
