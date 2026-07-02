Now I have enough information. Let me compile the specification.

# Slates Specification for DeepImage

## Overview

Deep-Image.ai is an AI-powered image processing service that provides image enhancement, upscaling (up to 300 megapixels), background removal, noise reduction, sharpening, and color/lighting correction. It offers a REST API for automated image processing workflows and supports integrations with cloud storage providers like AWS S3, Dropbox, Google Drive, and OneDrive.

## Authentication

DeepImage uses **API key** authentication. All API requests must include the API key in the `X-API-KEY` HTTP header.

- **Obtaining an API key:** Create an account at [deep-image.ai](https://deep-image.ai/) and retrieve your API key from your profile page at `https://deep-image.ai/app/my-profile/api`.
- **Usage:** Include the header `X-API-KEY: YOUR_API_KEY` in every request.
- **Base URL:** `https://deep-image.ai/rest_api/`

No OAuth or additional scopes are required. There is a single API key per account.

## Features

### Image Enhancement & Upscaling

Automatically improve image quality using AI. Enhancements include denoising, deblurring, sharpening, lighting correction, color saturation, and white balance adjustment. Images can be upscaled by specifying target width/height in pixels or as a percentage (up to 4x). The AI adapts improvements based on image content.

- **Parameters:** `enhancements` array (values: `denoise`, `deblur`, `light`, `color`), `width`, `height`, `light_parameters`, `color_parameters`, `white_balance_parameters`.
- Output format can be set to JPEG, PNG, or WebP with configurable quality and max file size.

### Background Removal & Generation

Remove backgrounds from images automatically, or replace them with a solid color or AI-generated background. Useful for product photography and e-commerce workflows.

- **Parameters:** Background `remove` mode, replacement `color`, and options for generating new backgrounds.

### Image Generation

Generate new images from text prompts, with support for advanced model types. Can also generate high-resolution images directly.

- Supports prompt-based generation and multiple model options.

### Face Enhancement & Face Swap

Enhance face details in photos for improved clarity. Face swap allows replacing a face in one image with a face from another image, with realistic blending and inpainting.

- Face swap requires one image with a visible face to replace and another image providing the source face.

### Prompt-Based Image Editing

Edit images using natural language text prompts in a chat-like experience. Supports uploading reference images and selecting from advanced AI models.

### Inpainting & Outpainting (Uncrop)

Extend the canvas of an image by generating realistic AI content beyond the original borders (outpainting/uncrop). Inpainting allows filling in or modifying specific regions of an image.

- Useful for adding space for text overlays or expanding tight crops.

### Resize, Padding & Framing

Resize images to specific dimensions, add padding/margins, and fit images into target frames while maintaining aspect ratio or adjusting as needed.

- **Parameters:** `width`, `height`, `fit` settings, padding configuration.

### Captions & Watermarks

Overlay caption images (e.g., logos or watermarks) onto processed images with configurable position, size, padding, and opacity.

- **Parameters:** Caption image URL, `position`, `target_width_percentage`, `padding`, `opacity`.

### AI Avatars & Business Photos

Generate photorealistic avatars or professional business photos from a face image. The AI renders the person in various styles such as formal, business, fantasy, or cinematic environments.

### Virtual Staging (Real Estate)

Transform real estate photos by adding or removing furniture, applying HDR lighting, and refining room aesthetics for listing photos.

### Presets

Pre-configured enhancement profiles for common use cases: e-commerce, real estate, print/photo, and digital art. Presets simplify configuration by bundling multiple enhancements together.

### Cloud Storage Integration

Process images directly from connected cloud storage (AWS S3, Dropbox, Google Drive, OneDrive) and save results back to storage using a unified `storage://` syntax.

- Google Drive has limitations when used via the API (no folder path support); the web app is recommended for Google Drive workflows.

### Account Information

Retrieve account details including available credits, username, email, API key, webhook configuration, and billing address.

## Events

DeepImage supports **webhooks** for job completion notifications.

### Job Completion

Receive a notification when an image processing job has finished. The webhook delivers the job ID, the original request data, and the result URL.

- **Configuration:** Specify a `webhooks.complete` URL in each processing request, or contact DeepImage support to set a default webhook URL on your account.
- The webhook payload includes the `job` identifier, the original request (`data`), and the `result_url` of the processed image.
