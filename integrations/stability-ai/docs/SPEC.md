# Slates Specification for Stability AI

## Overview

Stability AI provides a REST API for AI-powered generative media creation, including image generation and editing (via Stable Diffusion models), audio generation and transformation (via Stable Audio), and 3D asset generation. The integration targets the current REST v2beta media APIs for generation, editing, control, upscaling, audio, and 3D endpoints, while account/profile endpoints remain on the documented v1 user APIs.

## Authentication

Stability AI uses **API Key** authentication exclusively.

- Go to the API Keys section on `platform.stability.ai`, click "Create API Key", and copy the generated key.
- The API key must be included in the `Authorization` header of every request.
- The key is passed as a Bearer token: `Authorization: Bearer <YOUR_API_KEY>`
- All APIs on the platform use the same authentication mechanism: passing the API key via the Authorization header.
- The base URL for API requests is `https://api.stability.ai`.
- API keys can be revoked from the Stability AI account management under the API Keys section in Security settings.

## Features

### Image Generation

Generate images from text prompts using Stable Image Core, Stable Image Ultra, and the Stable Diffusion 3.5 model suite. Key parameters include prompt, negative prompt, aspect ratio, seed, style preset, CFG scale for SD3.5, image-to-image reference image for supported models, and output format (PNG, JPEG, WebP).

### Image Editing

A suite of editing tools including: erasing unwanted elements, outpainting (extending image boundaries), inpainting (editing specific masked areas), search-and-replace (swapping objects via text), search-and-recolor (changing colors of specific objects), and background removal. The grouped tool validates operation-specific required fields locally and returns generated media as Slate attachments.

### Image Upscaling

Conservative Upscale takes images up to 4K resolution while preserving all aspects and minimizing alterations. Creative Upscale accepts images from 64x64 to 1 megapixel and enhances resolution up to 4K with significant reinterpretation (adjustable via creativity scale). It works best on heavily degraded images. A Fast Upscale option is also available for quick resolution increases without prompt guidance.

### Style Transfer

Style Guide generates new content in the style of a reference image. Style Transfer applies visual characteristics from a separate style image to an existing init image while preserving composition, useful for maintaining brand consistency and unifying visual content.

### Image Control

Control features allow generating images guided by structural inputs such as sketches, offering a solution for design projects requiring brainstorming and frequent iterations. For non-sketch images, it leverages contour lines and edges for detailed manipulation of the output.

### Replace Background and Relight

Allows replacing the background of a subject image with a new scene described by a text prompt. Includes lighting controls for adjusting the reference, direction, and intensity of lighting.

### Audio Generation

Stable Audio 3 supports text-to-audio, audio-to-audio, and audio inpainting workflows with strong prompt adherence for genre and style control. It generates 44.1 kHz stereo audio and supports durations up to 380 seconds. Stable Audio 2.5 and Stable Audio 2 remain available through the current Stable Audio 2 endpoints with durations up to 190 seconds.

### 3D Generation

Stable Point Aware 3D (SPAR3D) provides complete 3D object generation from a single image, combining point cloud sampling with mesh generation and controls for target type/count, guidance scale, and seed. Stable Fast 3D generates GLB 3D assets from a single image with texture resolution, foreground ratio, remesh, and vertex count controls. Generated GLB files are returned as Slate attachments.

### Account Management

The API allows retrieving user account information and checking credit balance programmatically, enabling usage monitoring and management.

## Events

The provider does not support events. Stability AI's API is a stateless request-response service for media generation and does not offer webhooks, event subscriptions, or any purpose-built polling mechanism for event notifications.
