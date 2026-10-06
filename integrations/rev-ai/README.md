# Rev AI

Transcribe recorded audio and video from a media URL. Read plain text or
speaker-labelled transcripts, download SRT or VTT subtitles, translate
transcripts, and generate summaries. Analyze sentiment, extract topics,
identify spoken languages, manage custom vocabularies, and inspect current
account credit balances.

Connect with an access token from the Rev AI dashboard. All processing is
asynchronous: keep the returned job ID and check its status before fetching
results. Translation and summary processing can complete after transcription.

## Tools

- **Submit Transcription Job** — submit a media URL with optional source headers,
  language, custom vocabulary, speaker settings, translation, or summary options.
- **Get Transcription Job** — check job status, failures, and enrichment progress.
- **List Transcription Jobs** / **List Jobs** — discover recent jobs and paginate
  across transcription, sentiment, topic, and language-identification APIs.
- **Get Transcript** — read text or timestamped JSON, plus requested translations
  and summaries.
- **Download Captions** — download original or translated SRT/VTT subtitle files.
- **Get Captions** — deprecated compatibility tool; use Download Captions.
- **Analyze Sentiment** / **Extract Topics** — submit English text or retrieve
  a completed analysis job.
- **Identify Language** — identify the language of recorded audio.
- **Manage Custom Vocabulary** — create, retrieve, list, and delete compiled
  vocabularies for transcription.
- **Delete Job** — delete a completed job and its associated data.
- **Get Account** — read the authenticated email and USD credit balances.

Prefer the default machine transcriber. Rev AI deprecated `low_cost` in July
2026; the value remains available for existing callers. Completion triggers
are no longer provided; use the job status tools.

See the [integration specification](docs/SPEC.md) and
[official API reference](https://docs.rev.ai/api/asynchronous/reference).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
