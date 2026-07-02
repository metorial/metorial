# Slates Specification for Claid.ai

## Overview

Claid.ai (by Let's Enhance) is an AI-powered image processing API that provides image editing, enhancement, background generation, AI fashion model photoshoots, text-to-image generation, and image-to-video conversion. It provides access to AI-based image editing workflows via a declarative interface, allowing users to enhance and restore images, resize to given requirements, separate objects from backgrounds, and align objects within frames. The API has three sub-components: Image Editing API, Image Generation API, and AI Photoshoot API, where operations within each sub-component can be combined in a single request.

## Authentication

The Claid API uses API keys via Bearer Auth for authentication with the following format: `Authorization: Bearer {YOUR_API_KEY}`. To get your API key, sign in to your Claid account and click the "Create API key" button from the Overview or API keys pages.

Once an API key is generated, you can either copy it or download it as a txt file. The key is only visible on the Claid dashboard once, at the time of creation.

**Permission Scopes:** Each API key can have permissions to perform Storage, Image editing, or both types of operations, with an Admin permission scope. Scopes can be assigned to an API key from the Claid dashboard at creation time or later via the API keys → Edit key page. It is recommended to create API keys with minimal permission scopes necessary for your use case.

**Base URL:** `https://api.claid.ai/v1/`

## Features

### Image Editing & Enhancement

Process images with a declarative operations object that can include restorations, adjustments, background manipulation, resizing, padding, privacy features, and generative style transfer.

- **Restorations:** AI upscaling with multiple modes (smart_enhance, smart_resize, faces, digital_art, photo), decompression artifact removal, and polish.
- **Adjustments:** HDR, exposure, saturation, contrast, and sharpness controls. Color and lighting correction can dynamically recognize underexposed areas and adjust where needed while preserving original colors.
- **Background:** Remove, blur, or replace backgrounds. Supports categories like general, cars, and products. Can set a solid background color.
- **Resizing:** Specify exact dimensions, percentages, or fit modes (bounds, cover, canvas, outpaint, crop).
- **Privacy:** Automatically blur license plates on images to meet privacy requirements. Also supports identity cropping.
- **Style Transfer:** Apply generative style transfer using a reference image and prompt, with depth, denoising, and style strength controls.
- **Output Options:** Supports JPEG, PNG, WEBP, AVIF output formats. Supports changing color space (RGB, CMYK, GRAY) and preserving or applying color profiles. DPI metadata can be set for print workflows.
- Supported input formats: BMP, GIF, JPEG, PNG, TIFF, WEBP, AVIF, and HEIC.

### AI Background Generation

Provides three ways to create a background for products: template-free (prompt-based), template-based (using a reference image), and automatic with Autoprompt AI.

- Accepts text prompts to define the background. Prompts can be generated automatically using Autoprompt AI or provided manually.
- Supports original placement (keeps product position from input) and absolute placement (manual control of position, scale, and rotation).
- A quality preset parameter can be set to "fast", "optimal", or "best" to balance generation speed and output quality.
- Supports negative prompts for excluding unwanted elements.
- Can generate images at 1024x1024 resolution and upscale them to 4K.

### AI Fashion Model Photoshoots

Takes flat-lay or mannequin garment photos and generates images with fashion models wearing the products.

- Provide garment images as URLs; you can pass multiple URLs or submit a complete look as a full outfit. Up to 5 garment images can be passed.
- You can specify a model image via URL; by default, a random suitable model will be chosen.
- Supports from 1 to 4 output images per request. Default is 1 image.
- Swimwear and lingerie may be flagged by safety filters.

### Text-to-Image Generation

Turn words into artwork and digital assets using a text-to-image AI generator.

- Can generate up to 4 images per request.
- The guidance scale controls how closely generated images match the prompt and can be adjusted for more control over output.

### Image-to-Video

Turn static visuals into motion by generating dynamic product or model animations from a single image. Provide the image and describe the motion to get ready-to-use animated content.

### Storage Connectors

Manage cloud storage connections for use as image input/output sources.

- You can connect cloud storage and use it as a source for images. The API supports AWS S3 and Google Cloud Storage. Web Folders are also supported.
- Storage connectors can be created, listed, updated, and deleted via the API.
- By default, if no output destination is specified, results are stored in a temporary bucket with a 24-hour lifespan and a public URL is provided.

### Async and Batch Processing

- The async endpoint returns a response without waiting for the actual result. The result should be queried with a subsequent request.
- The batch endpoint allows batch processing of images by specifying a cloud storage directory as input. It behaves like the async endpoint, returning a response without waiting for the result.

## Events

Claid.ai supports webhooks for async processing notifications.

### Async Job Completion Webhooks

Configure webhook preferences at Integrations → Webhook Settings in the Claid.ai dashboard, providing the endpoint URL where you want to receive notifications.

- Subscribed event types include: success pipelines (when a request completes successfully) and error pipelines.
- Optionally set a shared secret to enable HMAC-SHA256 webhook signature verification, allowing you to verify that incoming requests were genuinely sent by Claid.
- Webhook notifications are useful for automating workflows, monitoring request statuses, or triggering actions when an image generation job completes — either successfully or with an error.
