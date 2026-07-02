# Slates Specification for Midjourney

## Overview

Midjourney is an independent research lab that produces a proprietary artificial intelligence program that creates images from textual descriptions, similar to OpenAI's DALL-E or Stable Diffusion. As of 2026, Midjourney has transitioned from a niche Discord-based tool to a comprehensive creative suite offering web interfaces, enterprise APIs, and multimodal capabilities including video and 3D asset generation. As of early 2026, Midjourney does not offer an official public developer API, REST endpoint, SDK, webhook interface, or documented API key system that you can obtain directly from Midjourney for programmatic use.

## Authentication

**Important: No Official Public API**

There is currently no official Midjourney API available to the public, so developers must rely on unofficial APIs to access image-generation features. These unofficial APIs typically use automation techniques such as browser emulation or bots to interact with Midjourney's platform, enabling developers to generate images programmatically.

Midjourney doesn't have an official API yet. While there are plenty of unofficial solutions, they not only violate MJ's terms of service but also put you at risk of getting your account banned.

There are two general approaches for programmatic access through unofficial third-party providers:

1. **Third-Party API Key (Provider-Managed Accounts):** Sign up with an unofficial API provider (e.g., APIFRAME, TTAPI, UserAPI, ImagineAPI), obtain an API key from their dashboard, and authenticate via an `Authorization` header or custom header (e.g., `TT-API-KEY`) in HTTP requests. The provider manages the Midjourney account interaction behind the scenes. No personal Midjourney subscription is required in this mode.

2. **Third-Party API Key + Own Midjourney Account (Self-Hosted/Hold Account Mode):** Some providers allow you to link your own Midjourney subscription. This typically requires providing your Discord authentication token or browser cookies from an active Midjourney session, along with the provider's API key. You must have an active Midjourney subscription on a Discord account.

Using these unofficial Midjourney APIs comes with the risk of having your Midjourney account banned, as such usage violates Midjourney's terms of service.

**Note on Enterprise API:** Midjourney is considering launching an enterprise API, but the release date is still unknown. One source mentions enterprise access with SSO, seat management, and API access, with API keys generated from a Developer Dashboard, but this has not been broadly confirmed and may not be publicly available.

## Features

Since there is no official API, the features below reflect the capabilities of Midjourney as exposed through its interfaces (Discord bot, web app) and commonly replicated by unofficial API providers.

### Text-to-Image Generation

Generate up to 4 images from a natural language text prompt (equivalent to the `/imagine` command). Supports parameters such as:

- **Aspect Ratio (`--ar`):** Control the width-to-height ratio of generated images.
- **Model Version (`--v`):** Select a specific Midjourney model version (e.g., V6, V6.1, V7).
- **Stylize (`--s`):** Adjust how strongly Midjourney's default aesthetic is applied.
- **Chaos (`--c`):** Increase variation across the generated image grid.
- **Quality (`--q`):** Control the rendering quality and GPU time spent.
- **Generation Mode:** Choose between fast, relax, and turbo processing speeds.
- **Negative Prompts (`--no`):** Exclude specific elements from the output.

### Image Variations and Upscaling

After generating an initial image grid, create variations of individual images or upscale them to higher resolution. Supports parameters like `--iw` (image weight for image prompts). Variations (V1-V4) enable generating variations of an existing image.

### Image Blending

Upload 2-5 images and combine them into a new image based on the concept and aesthetic of each image. Supports configurable dimensions (square, portrait, landscape).

### Describe (Image-to-Text)

Use Describe to turn your own images into inspiring prompt ideas. Provide an image and receive suggested text prompts that could generate similar images.

### Image Prompting and References

- Influence the content, composition and colors of your creations using image prompts.
- Match the look and feel of another image by using style references.
- Put a person or object into your images using an Omni Reference.
- Use the same character in multiple images and scenes using character references.

### Inpainting (Vary Region)

Selectively modify portions of a generated image by specifying a mask area and a new prompt, while keeping the rest of the image unchanged.

### Pan and Zoom

Expand the canvas of an image in any direction (pan) or zoom out to reveal more of the scene around an existing generation.

### Personalization

Create custom image styles with personalized profiles and moodboards using --p.

### Draft Mode

V7 introduces Draft Mode, which enables faster, lower-cost image generation for rapid iteration.

### Video Generation

Turn your images into captivating 5 second videos.

### Niji Mode

Niji models are a special series within Midjourney, developed in collaboration with Spellbrush, to focus on Eastern and anime aesthetics and illustrative style.

## Events

Midjourney itself does not provide any official webhook or event subscription mechanism.

Some unofficial third-party API providers support webhooks for job completion notifications. For example, when a webhook URL is provided, task object updates are sent via the POST method whenever the task status changes. If the webhook type is set to "progress," webhooks provide updates on the task's progress and also notify upon task completion or errors. However, these are features of the third-party providers, not of Midjourney itself.

**The provider does not natively support events.**
