# Slates Specification for Elevenreader

## Overview

ElevenReader is a text-to-speech reading application by ElevenLabs that converts written content (PDFs, eBooks, articles, web pages) into natural-sounding audio using AI voices. It is part of the broader ElevenLabs platform, and its API integration is provided through the ElevenLabs API, which covers text-to-speech, speech-to-text, voice management, dubbing, sound effects, music generation, and conversational AI agents.

## Authentication

ElevenLabs uses API key authentication. Every request must include the API key in an `xi-api-key` HTTP header.

- **Obtaining a key:** Create an API key from the ElevenLabs developer dashboard at `https://elevenlabs.io/app/developers/api-keys`.
- **Scope restrictions:** Each API key can be scoped to specific API endpoints and assigned custom credit limits.
- **Header format:** `xi-api-key: YOUR_API_KEY`
- **Base URL:** `https://api.elevenlabs.io/v1/`
- **Single-use tokens:** For client-side use cases (e.g., browser-based apps), short-lived single-use tokens can be generated via the API to avoid exposing the API key.

## Features

### Text to Speech

Convert text into lifelike audio with control over voice selection, model, language, and output format. Supports real-time streaming via HTTP chunked transfer encoding and WebSocket connections. Output formats include MP3, PCM, and μ-law. Pronunciation dictionaries can be used to control how specific words are spoken.

### Speech to Text

Transcribe spoken audio into text. Supports both real-time and asynchronous (batch) transcription modes. Asynchronous tasks can notify completion via webhooks.

### Voice Management

Browse, search, and manage voices. Add voices from the public voice library, clone voices from audio samples, edit voice settings (stability, similarity, style), and design new voices using text prompts. Access to over 10,000 pre-built voices.

### Music Generation

Generate music compositions from text descriptions, including stems, lyrics, and full tracks.

### Sound Effects

Generate sound effects from text descriptions. Supports various lengths and looping.

### Dubbing

Translate and voice-over audio/video content into other languages while preserving the original speaker characteristics.

### Voice Changer

Replace one voice in audio with another selected voice.

### Audio Isolation

Separate vocal tracks from background noise in audio files.

### Text to Dialogue

Generate natural-sounding multi-speaker dialogue from text scripts.

### Conversational AI Agents

Create, configure, and manage voice-based conversational AI agents. Agents can be equipped with server-side and client-side tools for external API integrations. Supports phone numbers, WhatsApp, SIP trunks, and widget-based deployment. Knowledge bases can be attached for RAG-powered conversations.

### Studio Projects

Manage ElevenLabs Studio projects programmatically, including creating and editing long-form audio productions such as audiobooks.

### Pronunciation Dictionaries

Create and manage pronunciation dictionaries to customize how specific words or phrases are spoken during text-to-speech generation.

### Workspace and Account Administration

Manage workspace settings, users, service accounts, usage analytics, billing, and data residency configuration.

## Events

ElevenLabs supports webhooks that can be configured from workspace settings. Webhooks are authenticated via HMAC signatures using a shared secret. Only workspace admins can configure webhooks.

### Post-Call Transcription

Triggered when a conversational AI agent call has finished and analysis is complete. Includes full conversation transcripts, analysis results, metadata, and call metrics. Two additional sub-types exist: audio-only webhooks (base64-encoded MP3 of the full conversation) and call initiation failure webhooks (sent when a call fails to connect).

### Voice Removal Notice

Triggered when a shared voice from the voice library is scheduled to be removed. Allows integrations to react before the voice becomes unavailable.

### Voice Removal Notice Withdrawn

Triggered when a previously scheduled voice removal is cancelled, meaning the voice will remain available.

### Voice Removed

Triggered when a shared voice has been permanently removed and is no longer usable.

### Speech-to-Text Completion

Triggered when an asynchronous (batch) speech-to-text transcription task is completed. The webhook URL is specified when submitting the transcription request.
