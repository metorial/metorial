# Slates Specification for HeyGen

## Overview

HeyGen is an AI video generation platform that creates videos using AI avatars that can speak provided text in multiple languages. Its API enables programmatic video creation, video translation with lip-sync, real-time interactive avatar streaming, text-to-speech, and personalized video campaigns at scale.

## Authentication

HeyGen supports two authentication methods:

### 1. API Key

Authenticate by passing your API key via the `X-Api-Key` header. Requires a HeyGen API key generated from Settings → API in your dashboard.

Example:

```
X-Api-Key: your-api-key
```

You cannot view your API key without re-generating it, so make sure that when you do generate it, you save it somewhere outside of HeyGen so you won't need to regenerate a different one again.

### 2. OAuth 2.0 (Authorization Code Flow with PKCE)

HeyGen supports OAuth 2.0 with the Authorization Code Flow and PKCE (Proof Key for Code Exchange) for added security.

Before you can implement OAuth, you need to submit an Integration Intake form to HeyGen. Upon approval, you'll receive your Client ID and have your Redirect URI approved.

**Endpoints:**

- Authorization URL: `https://app.heygen.com/oauth/authorize`
- Token endpoint: `https://api2.heygen.com/v1/oauth/token`
- Refresh token endpoint: `https://api2.heygen.com/v1/oauth/refresh_token`

**Authorization URL parameters:**

- `client_id` – Your Client ID
- `state` – A unique random string for CSRF protection
- `redirect_uri` – Your approved redirect URI (URL-encoded)
- `code_challenge` – PKCE code challenge (S256 method)
- `code_challenge_method` – Set to `S256`
- `response_type` – Set to `code`

**Token exchange parameters:**

- `code` – The authorization code received
- `client_id` – Your Client ID
- `grant_type` – `authorization_code`
- `redirect_uri` – Your redirect URI
- `code_verifier` – Your PKCE code verifier

After obtaining an access token, use the `Authorization` header with the Bearer scheme. This is the method enabled by OAuth integration.

Access tokens expire. Keep track of token expiration and refresh as needed. Access tokens expire after 864,000 seconds (10 days). Use the refresh token endpoint with `grant_type=refresh_token` to obtain a new access token.

No specific OAuth scopes are documented; the OAuth integration appears to grant full API access based on the user's account permissions.

## Features

### Avatar Video Generation

The API's core functionality revolves around generating videos with realistic AI avatars that can speak any text you provide or sync with audio files. You select an avatar and a voice, provide a script, and HeyGen generates a video. Supports multi-scene videos with different avatars, voices, backgrounds, and layouts per scene. You can customize backgrounds, translate videos into multiple languages, and work with templates for more complex productions. You can also create transparent avatar videos (no background). Video generation is asynchronous — you submit a request and poll for status or use webhooks to get notified when complete.

- Available avatars and voices can be listed via the API.
- Voice options include HeyGen voices and ElevenLabs voice models with configurable stability and speed settings.
- Supports audio file input as an alternative to text-to-speech.

### Avatar IV (Photorealistic Avatars)

An endpoint enables programmatic generation of AI-powered avatar videos using advanced photorealistic avatar technology. This endpoint allows you to create videos with custom avatars speaking your provided text or audio. This is a premium tier that consumes more credits than standard avatar generation.

### Video Agent (Prompt-to-Video)

The Video Agent endpoint is a "one-shot" tool that creates high-quality avatar videos from simple, natural language prompts. Instead of manually configuring every scene, script, and asset, you can provide a description of what you want. The Video Agent handles the heavy lifting — from scriptwriting to visual assembly.

### Template-Based Video Generation

Effortlessly generate customized videos from templates. If you need to generate hyper-personalized video at scale, templates are the perfect choice. Templates are created in HeyGen's web interface and contain dynamic variables (using `{{variable_name}}` notation) that can be populated via the API. You can list templates and retrieve their variable definitions programmatically.

### Personalized Video Campaigns

Creating personalized videos in HeyGen involves three main steps: defining a video template with variables, generating videos from that template with specific values, and delivering the videos to recipients. This feature allows programmatically importing contacts into your HeyGen Personalized Video project via the API. This feature is available exclusively for Enterprise users. You can add contacts with custom variables and retrieve video details and project details.

### Video Translation

HeyGen provides a powerful solution for effortlessly translating videos, integrating natural voice cloning and authentic speaking styles seamlessly. You submit a video (by URL or HeyGen video ID) for translation into one or more target languages. Two quality modes are available: a standard mode optimized for speed, and a premium "quality" mode that produces more natural lip-sync. Translation is asynchronous.

### Interactive Avatar Streaming

Create dynamic and interactive experiences using Interactive Avatars in the Streaming API. This enables real-time, bidirectional avatar sessions where the avatar can respond to user input via text or voice. A session token must be created first using your API key, then used to establish a streaming session. Useful for building conversational AI experiences embedded in applications.

### Text-to-Speech

Previously available only in AI Studio on the web, you can now programmatically generate natural-sounding speech from text. You can list compatible voices and generate audio from text input. This produces audio-only output, suitable for narration, podcasts, or IVR prompts.

### Photo Avatars

Generate live-looking photo avatar videos with the Photo Avatars API. Upload a photo and generate avatar videos from it. You can also manage (list, upload, delete) talking photos in your account.

### Asset Management

Upload images, videos, and audio files for use in video generation. These assets can be used as backgrounds, custom audio inputs, or other visual elements in your video projects.

### Account & Quota Management

Check remaining API credit balance and account information. API usage is measured in credits, and credits are deducted based on the type and length of what you generate. As a general rule, 1 credit = 1 minute of generated avatar video (standard generation).

## Events

HeyGen supports webhooks for real-time event notifications. HeyGen sends these webhook events to your configured endpoint based on your subscriptions. You will only receive events that you have subscribed to.

You register a webhook endpoint via the API by providing a URL and a list of event types to subscribe to. HeyGen sends the `event_type` and `event_data` to your endpoint. Each registered endpoint receives a `secret` that can be used to verify webhook signatures (HMAC-SHA256 on the request body, sent in the `Signature` header).

### Avatar Video Events

- **`avatar_video.success`** — Fired when an avatar video has been successfully generated. Includes the video URL, GIF download URL, share page URL, and callback ID.
- **`avatar_video.fail`** — Fired when avatar video generation fails. Includes a failure message.

### Video Agent Events

- **`video_agent.success`** — Fired when a Video Agent prompt-to-video generation completes successfully.
- **`video_agent.fail`** — Fired when a Video Agent generation fails.

### Video Translation Events

- **`video_translate.success`** — Fired when a video translation job completes successfully.
- **`video_translate.fail`** — Fired when a video translation job fails.

### Personalized Video Events

- **`personalized_video`** — Fired for personalized video generation status updates.
