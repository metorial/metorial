# Slates Specification for Fal.ai

## Overview

Fal.ai is a serverless generative AI platform that provides a unified API to run inference on 1,000+ production-ready models for image, video, audio, and 3D content generation. It gives instant access to state-of-the-art AI models for image, video, audio, and multimodal generation, with automatic scaling, queue-based reliability, and pay-per-use billing.

## Authentication

Fal.ai uses **API Key** authentication exclusively.

### Obtaining an API Key

Fal.ai relies on API keys for authentication. You generate one from the dashboard by logging in and clicking on the "Keys" section under your profile, then selecting "Generate New Key." The system displays the key immediately—copy it and store it securely, as Fal.ai does not show it again.

If you're part of a team, make sure to select your team in the top-left corner of the dashboard before creating a key. Keys are scoped to the account (personal or team) that created them.

### Key Scopes

When creating a key, you choose a scope:

- **API scope**: Suitable for most use cases including model discovery, pricing, and analytics. Use this for running model inference.
- **Admin scope**: Some Platform APIs require Admin scope keys for access to sensitive data. Required for managing API keys, deploying custom models, and managing compute instances.

When creating a key, you'll choose a scope that controls what the key can access. If you're not sure which to choose, start with API scope. You can always create an additional ADMIN key later if you need to deploy models.

### Using the API Key

Include your API key in the `Authorization` header with the `Key` prefix:

```
Authorization: Key YOUR_API_KEY
```

The key format is `key_id:key_secret` (e.g., `abc123def456:sk_live_abc123def456xyz789`).

Alternatively, set the `FAL_KEY` environment variable and the official client libraries will pick it up automatically.

### API Base URLs

- **Synchronous model inference**: `https://fal.run/`
- **Queue-based model inference**: `https://queue.fal.run/`
- **Platform APIs**: `https://api.fal.ai/v1/`

## Features

### Model Inference (Image Generation)

Run text-to-image and image-to-image generation across a wide range of models (FLUX, Stable Diffusion, Imagen, Ideogram, Recraft, etc.). Popular models such as Flux, Stable Video Diffusion, ControlNets, Whisper and more are available as ready-to-use APIs.

- Key parameters include prompt, image size/aspect ratio, number of inference steps, guidance scale, seed, safety checker toggle, and number of images.
- Supports LoRA adapters for customized model styles.
- Input images can be provided as URLs, Base64 data URIs, or uploaded to fal's built-in file storage.

### Model Inference (Video Generation)

Generate videos from text, images, or other videos using models like Veo, Sora, Kling, LTX, and others. LTX-2.3, for example, supports text-to-video, image-to-video, and audio-to-video.

- Parameters vary by model but typically include prompt, aspect ratio, duration, and audio toggle.
- Some models support video-to-video transformation (remixing, style transfer, motion transfer).

### Model Inference (Audio & Speech)

Generate speech from text and transcribe audio to text. You can call the transcription API using models like Wizper (Whisper). Text-to-speech endpoints support voice cloning from reference audio.

- Transcription supports speaker diarization, language detection, and word/segment-level chunking.
- TTS supports multiple languages, custom pronunciation dictionaries, and reference audio for voice cloning.

### Model Inference (3D Generation)

Tripo3D on fal offers image-to-3D conversion that transforms 2D images into fully realized 3D models in seconds. Text-to-3D generation is also available.

### Asynchronous Queue Processing

Submit requests to fal.ai's queue system for asynchronous processing. This is the recommended approach for most use cases.

- Submit a request and receive a `request_id`.
- Poll for status (IN_QUEUE, IN_PROGRESS, COMPLETED).
- Retrieve the result once completed.
- Cancel queued requests when needed.
- Optionally provide a `webhook_url` to receive results automatically upon completion.

### Streaming

For applications that require real-time interaction or handle streaming, fal offers a WebSocket-based integration. This allows you to establish a persistent connection and stream data back and forth between your client and the fal API.

- Some models also support HTTP streaming via Server-Sent Events (SSE).
- Useful for real-time image generation, LLM text streaming, and interactive applications.

### File Storage

Fal provides a convenient file storage that allows you to upload files and use them in your requests. You can upload files using the client API and use the returned URL in your requests.

- Uploaded files are hosted on fal's CDN and can be referenced by URL in model inputs.

### Model Discovery & Pricing

The Platform APIs provide model metadata to search and discover available model endpoints, pricing information to retrieve real-time pricing and estimate costs, usage tracking to access detailed usage line items, and analytics to query time-bucketed metrics for request counts, success/error rates, and latency.

### API Key Management

You can create API keys programmatically. Authentication is required via admin API key. Keys can be listed, created with aliases, and revoked through the API.

### Custom Model Deployment (Serverless)

Manage apps, runners, and deployments programmatically. Deploy your own models to fal's serverless infrastructure with configurable scaling settings (concurrency, keep-alive, machine types, regions).

### Compute Instance Management

A REST API for managing compute instances on the fal platform. Create, list, retrieve details, and delete dedicated GPU instances. Requires Admin scope API keys.

## Events

Fal.ai supports **webhooks** for asynchronous request completion notifications.

### Queue Completion Webhooks

Setting up a webhook is straightforward. Pass a `webhook_url` when submitting a request to the queue, and fal will POST the result to that URL when processing completes.

- The webhook payload includes the `request_id`, `gateway_request_id`, `status`, and the model output `payload`.
- Initial webhook deliveries have a 15-second timeout. If a delivery exceeds this time or fails to deliver the payload, it will retry 10 times in the span of 2 hours.
- To ensure the security and integrity of incoming webhook requests, you must verify that they originate from the expected source. This involves validating a cryptographic signature included in the request using a set of public keys. Signatures use ED25519 keys available via a JWKS endpoint.
- Webhook is specified per-request (not globally configured); each queue submission can specify its own `webhook_url`.
