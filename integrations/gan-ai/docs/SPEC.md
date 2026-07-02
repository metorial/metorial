Now let me also check the Studio API (docs.gan.ai) for the video personalization side and the webhook for that:Now I have comprehensive information about both Gan.AI APIs. Let me compile the specification.

# Slates Specification for Gan.AI

## Overview

Gan.AI is an AI platform for personalized video creation, text-to-speech synthesis, AI avatar generation, lip-sync video production, and sound effect generation. It offers two main API surfaces: the **Playground API** (`os.gan.ai`) for TTS, avatars, lip-sync, and sound effects, and the **Studio API** (`api.gan.ai`) for personalized video campaigns at scale. The platform supports 70+ global languages and 22+ Indic languages.

## Authentication

Gan.AI uses two different authentication methods depending on which API surface you are using:

### Playground API (developer.gan.ai)

Uses **API Key** authentication.

1. Visit [playground.gan.ai](https://playground.gan.ai) and generate an API key.
2. Include the key in all requests via the `ganos-api-key` header.

Example:

```
curl --url https://os.gan.ai/v1/voices \
  --header 'ganos-api-key: YOUR_API_KEY'
```

### Studio API (docs.gan.ai)

Uses **email/password** authentication with **Bearer tokens**.

1. Send a `POST` request to `https://api.gan.ai/users/login` with your `email` and `password` in the JSON body.
2. The response returns an `access_token` and a `refresh_token`.
3. Include the access token as a `Bearer` token in the `Authorization` header for subsequent requests.

The Studio API also supports creating and managing **dynamic tokens** (long-lived tokens) that can be listed and revoked.

## Features

### Text-to-Speech (TTS)

Convert text into natural-sounding speech. Choose from available voices (5 free voices included) and specify a language. Supports 22 Indic languages and English, including code-mixed language in a single request. Enterprise users can access voice cloning and cross-lingual voice cloning (restricted beta). History of previously generated speech is accessible.

### AI Avatar Creation and Video Generation

Create a digital avatar from a recorded or uploaded video (minimum 30 seconds of clear footage). Once an avatar is published, generate HD videos from text scripts — the avatar speaks the provided text with lip-sync and voice synthesis. Stock avatars are also available for all plans. Supports up to 2,000 characters per video script. Avatar consent management is built into the workflow. Avatars can be listed, inspected, and deleted.

### Photo Avatars

Create avatars from a still photo rather than video. Generate videos from photo avatars by providing a script. List and manage photo avatars and their generated video inferences.

### Lip-Sync

Combine an audio file with a source video to produce a lip-synchronized output video. Requires a video with a visible face and an audio file containing speech.

### Sound Effects Generation

Generate audio sound effects from a text description (e.g., "thunderstorm rumbling" or "birdsong at dawn"). Configurable duration and a creativity slider to control how closely the output matches the prompt. Includes preset options and access to generation history.

### Personalized Video Campaigns (Studio)

Create personalized videos in bulk by specifying a project ID and passing per-recipient tags and variable values (e.g., names, custom text). Each video gets a unique landing page. Manage projects and workspaces. Query video generation status per inference ID.

### Voice Management

List available voices with their names, descriptions, and sample audio. Used to select a voice for TTS or avatar video generation.

## Events

Gan.AI supports webhooks for real-time status notifications across both API surfaces.

### Avatar Events (Playground API)

Triggered during the avatar creation lifecycle. Reports statuses such as processing, published, failed, consent pending, and consent failed. Webhook URL is registered when creating an avatar via the `webhook_data.webhook_url` field.

### Avatar Inference Events (Playground API)

Triggered when a video is being generated from a published avatar. Reports succeeded or failed status along with the inference ID. Registered via the same webhook mechanism as avatar creation.

### LipSync Inference Events (Playground API)

Triggered upon completion of a lip-sync video generation process. Reports succeeded or failed status. Registered when creating a lip-sync job via the `webhook_data.webhook_url` field.

### Video Status Events (Studio API)

Triggered when personalized video copies finish generating within a project. A webhook URL is registered per project via `POST /projects/{project_id}/webhook`. The payload includes the video URL (on success) or error details (on failure) keyed by each unique video ID. Supports optional configuration for sending query parameters, replacement data, payload serialization, and tags mapping.
