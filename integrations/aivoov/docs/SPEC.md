# Slates Specification for Aivoov

## Overview

AiVOOV is a text-to-speech platform that provides a single interface to convert text to audio using AI voices from Google, Amazon, IBM, and Microsoft. It offers over 2300+ voices across 155+ languages, supporting MP3 and WAV output formats.

## Authentication

AiVOOV uses API key authentication.

- All requests must include your API key in the `X-API-KEY` header.
- To access your credentials, make sure you're logged in to your aivoov.com account, then visit your Profile page → API.
- The API is a premium feature and is available only with selected plans. You need to have an AiVOOV account with Characters Credit to be able to access the API.

Example header:

```
X-API-KEY: YOUR-API-KEY
```

## Features

### Text-to-Speech Generation

Convert text into audio using AI voices. Supports multiple text segments with different voices in a single request, with optional SSML controls for pitch (-50 to 50), speaking rate (20 to 200), and volume (-40 to 40).

- **Voice selection**: Choose from 2300+ voices across providers (Google, Amazon, IBM, Microsoft). Multiple voices can be used within the same request to create conversational audio.
- **SSML controls**: Adjust pitch, speaking rate, and volume per text segment, or use defaults.
- Output is available in MP3 and WAV formats.

### Voice Discovery

Retrieve the list of available voice IDs, with optional filtering by language code (e.g., `en-US`).

- Returns voice metadata including voice ID, name, and language.
- Voices can be stored locally in your database for reuse.

## Events

The provider does not support events.
