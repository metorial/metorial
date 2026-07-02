Now let me check for the voice conversion endpoint and account info endpoint I saw mentioned:# Slates Specification for LMNT

## Overview

LMNT is an AI-powered text-to-speech and voice cloning platform. With its API, users can create voice clones with just 5 seconds of audio and generate lifelike speech in real-time. The API supports models like "aurora" and "blizzard" and multiple languages including English, Spanish, Portuguese, French, German, Chinese, Korean, Hindi, Japanese, Russian, Italian, and Turkish.

## Authentication

LMNT uses API key authentication. Get your API key by going to your account page at app.lmnt.com. If you are not signed in yet, you will be prompted to sign in. In the Your Account section, you can see details about your account. Scroll down to see the section titled API Keys. The string of numbers and letters is your API key. Click it to copy it to your clipboard.

The API key is passed via the `X-API-Key` header in REST API requests. The authorization header is `X-API-Key` and is required for all requests.

Example:

```
X-API-Key: your_api_key_here
```

When using SDKs, the API key can be provided as a constructor argument (`api_key`) or set as the `LMNT_API_KEY` environment variable.

## Features

### Text-to-Speech Generation

Converts text into synthesized speech audio. Generates speech from text and streams the audio as binary data chunks in real-time as they are generated.

- **Voice**: Select from a library of pre-built voices or custom cloned voices using a voice ID.
- **Model**: Choose between models such as "aurora" and "blizzard".
- **Language**: Specify the desired language using a two-letter ISO 639-1 code. Defaults to auto language detection, but specifying the language is recommended for faster generation.
- **Output format**: Options include aac, mp3, mulaw, raw, and wav.
- **Sample rate**: Output sample rate in Hz, defaulting to 24000.
- **Temperature**: Influences how expressive and emotionally varied the speech becomes. Lower values create more neutral, consistent speaking styles.
- **Top-p**: Controls the stability of the generated speech. A lower value produces more consistent, reliable speech, while a higher value gives more flexibility.
- **Speed and length**: Control the speaking rate or target a specific duration for the output.
- Max 5000 characters per request (including spaces).

### Real-Time Streaming via WebSocket

Stream text to LMNT's servers and receive synthesized audio in real-time at low latency with the WebSocket API. This is suited for conversational applications, virtual agents, and interactive experiences. The WebSocket endpoint also supports streaming timestamps along with speech.

### Voice Cloning

Create custom voices from audio samples. For Instant Voices, as little as 30 seconds of source audio gets you an instant clone. Professional voices require at least 5 minutes of source audio to train from.

- **Voice type**: Choose between "instant" (default) and "professional" voice types.
- **Audio input**: One or more input audio files in wav, mp3, mp4, m4a, or webm format.
- **Enhance**: For unclean audio with background noise, applies processing to attempt to improve quality. Default is false as this can also degrade quality in some circumstances.
- **Metadata**: Add a name, description, and gender tag to the voice.

### Voice Management

List, retrieve, update, and delete voices. Returns details of a specific voice including ID, name, owner, state, description, gender, type (instant or professional), and a preview audio URL. Professional voices that are not being used will not be upgraded automatically and will enter a frozen state. You can unfreeze a voice to upgrade it to the latest model. Instant voices always use the latest model and are never frozen. Voices can be starred for quick access.

### Account Information

Retrieve account details and usage information via the Account info endpoint.

## Events

The provider does not support events. LMNT's API is a request-response and WebSocket-based service with no webhook or event subscription mechanism.
