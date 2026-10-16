# DynaPictures Integration Specification

## Overview

DynaPictures is a cloud-based dynamic image and PDF generation platform. It allows users to create reusable image templates and then programmatically generate customized images and PDFs by replacing text, images, and styling via API. It also supports AI-powered text-to-image generation.

## Authentication

DynaPictures uses API keys for authentication.

The API key must be included in all requests as a Bearer token in the `Authorization` header:

```
Authorization: Bearer API_KEY
```

To obtain your API key, sign in to your DynaPictures account and navigate to the account page or the API console for a particular image template. No OAuth flows, scopes, or additional credentials are required.

## Features

### Image Generation

Generate customized images from predefined templates by providing parameters for each layer (text, images, styling). To start generating images via API, create a reusable image template first and then make API requests with custom parameters to customize your image. You can change text, images and appearance of the generated image.

- Supported output formats: PNG, JPEG, WebP, AVIF.
- Each template layer (text, image, shape, chart) can be individually customized with content, colors, borders, opacity, and positioning.
- Image layers support smart cropping modes including AI-based face detection (`ai_face`) to keep faces visible when cropping.
- Image effects such as grayscale, blur, sepia, and drop shadows can be applied to image layers.
- Chart layers can be customized with data values, labels, and colors.
- Custom metadata can be attached to each generated image for downstream use.
- Generated images can be deleted via the API.

### Multipage Image and PDF Generation

Generate multiple images from multipage templates in a single request, or combine them into a single PDF document.

- Set `format` to `pdf` to receive a consolidated PDF file instead of individual images.
- The Batch API allows generating PDFs where each page can use a different template, enabling flexible multi-template document assembly.

### Template Management

List and retrieve details of image templates available in your account.

- Returns template metadata including name, thumbnail, creation/update dates, and layer definitions (type, name, dimensions).
- Templates must have the "Sync to Zapier" checkbox enabled to appear in the list.

### Workspace Management

Organize templates, assets, and generated images into separate workspaces for multitenancy or project isolation.

- Create, update, list, and delete workspaces via the API.
- Useful for provisioning per-client or per-project environments, e.g., when onboarding new clients from a CRM.
- Deleting a workspace permanently removes all its templates, media library files, and generated images.
- Only account admins can create or modify workspaces.

### Media Library Management

Upload and manage image assets in a per-workspace media library for use in image generation.

- Upload, list, retrieve, and delete image assets. Uploads read a publicly accessible image URL and send the bytes as multipart form data.
- Uploading images to the media library before using them in generation improves performance, as DynaPictures can skip downloading them externally.
- Assets include metadata such as MIME type, filename, file size, and thumbnail URLs.

### AI Image Generation

Harness the power of AI image generation and turn text to image by providing a textual description. Simply enter your prompt and the AI image generator will create images from text instantly, then these images can be used for multiple purposes. With DynaPictures, you can define your preferred layout using a template that includes text and image elements. Dynamic AI Image layers accept a prompt, optional source image, and named reference images. Their model and aspect ratio are configured in the template editor. The standalone API supports choosing a model and ratio per generation request.

### File Results and Response Shapes

- `generate_image` returns the actual JSON response, with a `pages` array for non-PDF multipage templates. Each returned image URL is available as a downloadable file. Legacy single-image fields are absent when the provider returns only pages; the full response is retained in `raw`.
- `generate_batch_pdf` receives streamed PDF content rather than JSON. The result is a downloadable PDF with its measured byte size and verified content type. Submitted options are retained separately as `requestContext`; no image ID, hosted URL, thumbnail, or dimensions are fabricated.
- `get_media_asset` includes the file for non-folder assets, using the provider's asset URL.
- `start_ai_generation` queues a job. Poll `get_ai_generation` about every two seconds until `done` or `error`; successful results include the hosted image and provider-reported credit fields. Hosted AI-image URLs have no documented retention guarantee or expiry timestamp.
- API errors retain provider status and message through the shared HTTP error handling. Numeric page and opacity input schemas retain their original number types; provider integer/range rules are checked at runtime.

### Scope and Documentation Limits

The public REST reference has no API-key profile, self, or current-account endpoint, so this integration does not invent an identity operation. The integration covers one product and does not split endpoint families into selectable products. The media replacement-upload endpoint is not exposed because its official curl example uses multipart `upload` while its request-body table says `file`; this needs provider clarification. Webhook client methods are retained, but no trigger lifecycle is advertised or implemented.

Official API reference: https://dynapictures.com/docs/

## Events

DynaPictures supports webhooks for event-driven notifications.

### New Image Generated

Subscribe to be notified when a new image is generated from a specific template. When the event fires, DynaPictures sends a POST request to the specified target URL containing the generated image details (image URL, thumbnail URLs, metadata, dimensions).

- **Event type:** `NEW_IMAGE`
- **Required parameters:** target URL, event type, and the template ID to scope the subscription to a specific template.
- Webhooks can be unsubscribed by sending a DELETE request with the same parameters used during subscription.
