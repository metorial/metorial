# Slates Specification for ElevenLabs

## Overview

ElevenLabs is an AI audio platform providing APIs for text-to-speech, speech-to-text, voice cloning, music generation, sound effects, dubbing, and conversational voice agents. It supports both real-time streaming and batch processing across 70+ languages with multiple AI models optimized for different quality and latency requirements.

## Authentication

ElevenLabs uses **API key** authentication. Every request to the API must include an API key in the `xi-api-key` HTTP header.

**Obtaining an API key:** Create an account and log in, click Developers in the left sidebar, then select the API Keys tab. You can create multiple API keys, and each key will have its own name for identification purposes.

**Header format:**

```
xi-api-key: YOUR_API_KEY
```

**Key scoping options:** Each API key can be configured with:

1. **Scope restriction:** Limit which API endpoints the key can access.
2. **Credit quota:** Define custom credit limits to control usage.

**Single-use tokens:** For certain endpoints, you can use single-use tokens to authenticate requests. These tokens are valid for a limited time and can be used to connect to the API without exposing your API key, for example from the client side.

**Service accounts:** ElevenLabs also supports service accounts for workspace-level programmatic access, where API keys can be created and managed per service account.

## Features

### Text to Speech

Turns text into lifelike audio with nuanced intonation, pacing, and emotional awareness. Multiple models are available with different trade-offs between quality, latency, language support, and cost. Supports real-time streaming output. Configurable voice settings include stability, clarity, and style. Multiple output audio formats are available (e.g., MP3, PCM).

### Speech to Text

Turns spoken audio into text with state-of-the-art accuracy. Supports both real-time streaming and batch transcription. Asynchronous transcription supports webhook notifications on completion.

### Music Generation

Generate music from text. Generate stems, lyrics, and full compositions with full flexibility. This is a batch operation with processing time proportional to content length.

### Text to Dialogue

Create natural-sounding dialogue from text. Supports multi-speaker dialogue generation using the Eleven v3 model, allowing natural conversations between characters.

### Voice Management

Clone someone's voice, generate one with a prompt, or use one of our existing 10k voices. Voice cloning works by uploading audio samples to create a new custom voice. Voices can be listed, created, edited, deleted, and shared. Voice settings (stability, similarity, style) can be customized per voice.

### Voice Changer

Replace one voice with another. Takes existing audio and transforms it to sound like a different voice.

### Audio Isolation

Isolate vocal tracks from background noise in audio.

### Dubbing

Dub audio and videos seamlessly (translate and voice-over content in other languages). This is a batch operation. Supports specifying source and target languages.

### Sound Effects

Create cinematic sound effects from text descriptions. Supports seamless looping and variable length generation.

### Voice Agents (ElevenAgents)

Deploy intelligent voice agents for interactive applications. These endpoints support building, launching, and managing AI-driven voice agents (with components like conversations, knowledge bases, phone integration). Agents can be configured with custom tools (client-side and server-side), knowledge bases, phone numbers, SIP trunks, Twilio integration, batch calling, and analytics. Conversation history and analytics can be retrieved via the API.

### Pronunciation Dictionaries

Customize how specific words or phrases are pronounced by TTS models (upload lexicon files to control pronunciation).

### Forced Alignment

Align text to audio (get precise word-level timestamps for given audio and transcript).

### Voice Remixing

Transform and enhance existing voices (remix voice characteristics or style).

### Audio Native

An embeddable audio player that automatically voices webpage content using ElevenLabs TTS service.

### Studio

Manage ElevenLabs Studio projects via API. Allows programmatic management of long-form audio production projects.

### History

Access generation history including metadata and audio files for past text-to-speech generations. History items can be listed, retrieved, and downloaded.

### Usage & Account

Retrieve subscription details, usage statistics, and manage user/workspace settings programmatically.

## Events

ElevenLabs supports webhooks for event notifications. Certain events within ElevenLabs can be configured to trigger webhooks, allowing external applications and systems to receive and process these events as they occur. For users within Workspaces, only the workspace admins can configure the webhooks for the workspace. Webhooks are authenticated via HMAC signatures using the `ElevenLabs-Signature` header.

### Post-Call Transcription

Triggered when a Voice Agents (ElevenAgents) call has finished and analysis is complete. Contains full conversation data including transcripts, analysis results, and metadata.

### Post-Call Audio

Contains minimal data with the full conversation audio as base64-encoded MP3. Triggered after a Voice Agents call completes.

### Call Initiation Failure

Call initiation failure webhook events are sent when a call fails to initiate due to connection errors, user declining the call, or user not picking up.

### Voice Removal Notice

Triggered when a shared voice is scheduled to be removed. A corresponding event fires when the removal notice is withdrawn, and another when the voice is actually removed and no longer usable.

### Speech to Text Completion

Webhooks allow you to receive automatic notifications when your Speech to Text transcription tasks are completed, eliminating the need to continuously poll the API for status updates.
