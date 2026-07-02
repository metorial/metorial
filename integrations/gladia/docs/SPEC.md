# Slates Specification for Gladia

## Overview

Gladia is an audio transcription and intelligence API provider. It offers both asynchronous and real-time speech-to-text transcription, along with audio intelligence add-ons, supporting 100+ languages with native code-switching and built-in features including diarization, translation, named-entity recognition, and sentiment analysis.

## Authentication

Gladia uses API key-based authentication. You first create an account at app.gladia.io, then navigate to the API keys section where a default key is automatically generated. You can use this key or create additional ones.

The API key is passed in the `x-gladia-key` HTTP header with every request, for example:

```
x-gladia-key: YOUR_GLADIA_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. The base API URL is `https://api.gladia.io`.

## Features

### Pre-recorded (Async) Transcription

Submit audio or video files (via file upload or URL) for asynchronous transcription. If working with local files, upload them first via the upload endpoint, as the transcription endpoint only accepts audio URLs. Results are retrieved by polling or via callback/webhook notification.

- Supports a wide range of audio and video formats (WAV, MP3, FLAC, AAC, M4A, etc.).
- Language detection can be automatic, or a specific language can be set. Code switching can be enabled to handle multilingual conversations.
- Multi-channel audio files are automatically transcribed with per-utterance channel identification.

### Live (Real-time) Transcription

Initiate a live transcription session via the API, then connect to a returned WebSocket URL to stream audio chunks in real time. Supports configurable encoding, sample rate, bit depth, and number of channels.

- Returns interim (partial) and final transcript results as the audio streams.
- Provides real-time events like `speech_start`, `speech_end`, and `transcript_result` through the WebSocket.
- Supports reconnection to the same session URL if the connection drops.
- Available in multiple regions (e.g., `eu-west`, `us-west`).

### Speaker Diarization

Organizes transcripts into segments corresponding to different speakers. Mono, stereo, and multi-channel files are all supported.

- Configurable with min/max speaker count or an explicit number of speakers.
- Available for both pre-recorded and live transcription.

### Translation

Translation is available in one API call to one or more target languages.

- Supports `base` and `enhanced` translation models.
- Can be combined with the subtitles feature to produce subtitles in both the original and target languages.

### Summarization

Generates a summary of the transcript. You choose from available summary types to customize the output.

- Available types: `general`, `concise`, and `bullet_points`.

### Sentiment Analysis

Detects sentiment and emotion for each sentence in the transcript, with speaker attribution when diarization is enabled.

- Sentiments include: positive, negative, neutral, mixed, unknown.
- Emotions include: adoration, anger, joy, fear, surprise, sadness, neutral, and more.

### Named Entity Recognition (NER)

Detects and classifies entities mentioned in the audio. Supports 50+ entity types across multiple categories. Useful for extracting names, companies, addresses, and other structured data.

### Chapterization

Automatically segments audio into logical chapters. Each chapter includes a headline, summary, and time range.

### Audio-to-LLM (Custom Prompts)

Allows generating answers, summaries, action items, and more from audio using custom prompts. You provide one or more prompt strings and receive LLM-generated responses based on the transcript.

### Subtitles Generation

Generate subtitles in SRT and/or VTT formats. Works alongside translation to produce subtitles in multiple languages.

### Custom Vocabulary & Spelling

The custom vocabulary feature lets you build a glossary of terms you want the transcription to recognize. Custom spelling allows mapping specific pronunciations to their correct written forms (e.g., "Sequel" → "SQL").

### Content Moderation

Detects and flags inappropriate or sensitive content within the audio transcript. Enabled via the `moderation` parameter.

### Structured Data Extraction

Extracts structured data from transcripts based on specified entity classes (e.g., person, organization). Configurable with custom class definitions.

### Name Consistency

Ensures consistent spelling and formatting of names throughout the transcript.

## Events

Gladia supports two notification mechanisms for asynchronous transcription completion:

### Account-level Webhooks

Webhooks can be configured at https://app.gladia.io/account to be notified when transcriptions are done. Once a transcription completes, a POST request is made to the configured endpoint containing the transcription ID. Gladia uses Svix to handle webhooks, providing reliable and secure event delivery.

- Events: transcription completion.
- Configured globally at the account level via the Gladia dashboard.

### Per-request Callback URLs

Instead of polling, you can provide a `callback_url` on the transcription request body, and the full results will be sent to that URL once the transcription is done.

- Configured per transcription request.
- For live sessions, various messages (transcripts, speech events, post-processing results) can be sent through the callback URL or webhooks, and you can specify which kinds of messages to receive.
