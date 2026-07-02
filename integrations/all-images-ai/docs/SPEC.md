I found the All-Images.ai API docs. Let me get more details from their documentation.Now I have all the information I need. Let me compile the specification.

# Slates Specification for All Images AI

## Overview

All-Images.ai is an AI image generation and stock image platform that uses Midjourney AI as its underlying engine. It provides an API to generate images from text prompts (producing 4 images per generation), search and purchase stock images, and manage image downloads. The API is accessible at `api.all-images.ai`.

## Authentication

All-Images.ai uses **API key** authentication via personal access tokens.

- API keys are created and managed from the user's account at `https://app.all-images.ai/en/api-keys`.
- To authenticate, include the token in the `api-key` HTTP header on every request:
  ```
  curl -H "api-key: <your_access_token>" https://api.all-images.ai/v1/api-keys/check
  ```
- Access tokens are tied to the user account that created them and inherit the same level of access and privileges.
- Tokens can be revoked from the API Keys page in the user account.

## Features

### Image Generation

Create AI-generated images from text descriptions. Each generation produces 4 image proposals. Two modes are available:

- **Simple mode**: Provide a plain-text description. Optional prompt optimization rewrites the description to improve results. Configurable parameters include:
  - **Photo type**: Realistic high-quality or smartphone-style photo.
  - **Format/aspect ratio**: Options include 1:1, 3:2, 2:3, 4:7, 7:4, 5:4, 4:5, 16:9, 9:16.
  - **Weather**: sunny, cloudy, foggy, rainy, thunderstorm, snowy.
  - **Time of day**: sunrise, morning, afternoon, sunset, evening, golden hour, night, midnight.
  - **Camera**: Specify a camera model (e.g., GoPro, Canon).
  - **Chaos** (0–100): Controls variation in results. Higher values produce more unexpected compositions.
  - **Stylize** (0–1000): Controls artistic stylization vs. prompt adherence.
  - **Interdiction**: Comma-separated list of elements to exclude from the image.
  - **Additional prompt**: Extra prompt text not affected by optimization, prepended to the prompt.
- **Advanced mode**: Enter a raw Midjourney "Imagine" prompt including Midjourney parameters directly.
- Generations can be tagged and have custom metadata attached.
- "Dedicated" plan users can choose between `fast` and `relax` processing modes.
- Failed generations can be retried after optionally modifying the prompt.
- Generation is asynchronous; status progresses through Create → Pending → Processing → Done (or Error).

### Image Search and Download

Search a library of AI-generated stock images and purchase/download them.

- **Search**: Find images by keywords. Can filter to free-only images.
- **Download/Buy**: Acquire an image by its ID, either as a binary file or as a set of direct public URLs (preview, full, upscale, and upscale UHD versions). Credits are consumed on first purchase; subsequent downloads of the same image do not cost additional credits.
- **Display**: Retrieve images directly via URL in "preview" or "full" format.
- **Download history**: List previously downloaded images, with optional date range filtering.

### API Key Management

Manage API keys and webhook subscriptions programmatically. Keys can be checked for validity, and webhook endpoints can be registered or removed per API key.

## Events

All-Images.ai supports webhooks for image generation lifecycle events. Webhook endpoints are registered per API key, either via the user account dashboard or via the API.

### Image Generation Status Changes

Webhooks fire when an image generation changes status. The following event types are available:

- **`print.created`**: Fired when a new image generation is created.
- **`print.active`**: Fired when generation processing begins.
- **`print.progress`**: Fired when an individual image within the generation is completed.
- **`print.completed`**: Fired when the entire generation finishes successfully.
- **`print.failed`**: Fired when the generation fails.

When subscribing, you can specify which event types to listen to. By default (if none are specified), only `print.failed` and `print.completed` are subscribed.
