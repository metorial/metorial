# Slates Specification for Stability AI

## Overview

Stability AI provides a REST API for AI-powered generative media creation, including image generation and editing (via Stable Diffusion models), audio generation (via Stable Audio), and 3D asset generation. Their API offers image generation from text prompts, image-to-image transformations, and various editing capabilities. The platform also includes audio generation via Stable Audio and 3D model generation via SPAR3D.

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

Generate images from text prompts using various Stable Diffusion models. Available model tiers include Stable Image Core (speed and affordability), and Stable Image Ultra (top-tier quality powered by Stable Diffusion 3.5). Key parameters include prompt, negative prompt, dimensions, seed, style preset, CFG scale, and output format (PNG, JPEG, WebP).

### Image Editing

A suite of editing tools including: erasing unwanted elements, outpainting (extending image boundaries), inpainting (editing specific masked areas), search-and-replace (swapping objects via text), search-and-recolor (changing colors of specific objects), and background removal. Each tool accepts an input image and typically a mask or text prompt describing the desired edit.

### Image Upscaling

Conservative Upscale takes images up to 4K resolution while preserving all aspects and minimizing alterations. Creative Upscale accepts images from 64x64 to 1 megapixel and enhances resolution up to 4K with significant reinterpretation (adjustable via creativity scale). It works best on heavily degraded images. A Fast Upscale option is also available for quick resolution increases without prompt guidance.

### Style Transfer

Style Transfer applies the visual aesthetic of one existing image to another, useful for maintaining brand consistency and unifying visual content. This is distinct from the Style Guide feature, which generates new content based on a style.

### Image Control

Control features allow generating images guided by structural inputs such as sketches, offering a solution for design projects requiring brainstorming and frequent iterations. For non-sketch images, it leverages contour lines and edges for detailed manipulation of the output.

### Replace Background and Relight

Allows replacing the background of a subject image with a new scene described by a text prompt. Includes lighting controls for adjusting the reference, direction, and intensity of lighting.

### Audio Generation

Stable Audio supports text-to-audio, audio-to-audio, and audio inpainting workflows with strong prompt adherence for genre and style control. Generates audio at 44.1 kHz stereo with coherent musical structures and supports melodies, sound effects, and various audio styles. Audio-to-audio mode maintains structural fidelity from input audio for seamless style transfers, supporting durations up to 3 minutes.

### 3D Generation

Stable Point Aware 3D (SPAR3D) provides real-time editing and complete 3D object generation from a single image in under a second, combining point cloud sampling with mesh generation. Stable Fast 3D generates high-quality 3D assets from a single image in 0.5 seconds.

### Account Management

The API allows retrieving user account information and checking credit balance programmatically, enabling usage monitoring and management.

## Events

The provider does not support events. Stability AI's API is a stateless request-response service for media generation and does not offer webhooks, event subscriptions, or any purpose-built polling mechanism for event notifications.
