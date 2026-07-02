Now let me check the details on media uploads and the transfer/export feature:Now I have enough information. Let me compile the specification.

# Slates Specification for Placid

## Overview

Placid is a creative automation platform that generates images, videos, and PDFs from reusable design templates populated with dynamic data. It provides a REST API, a URL-based image API, and an embeddable Editor SDK for managing templates and generating visuals at scale.

## Authentication

### REST API — Bearer Token (API Key)

The Placid REST API uses authentication via an API token. It is passed along with every API call to identify your account and access the templates from your project. Placid API tokens are project-specific.

To obtain your API token:

1. Log in at `placid.app/login`
2. Go to the **Projects** overview
3. Select the project you want to work with
4. Click **API Tokens** in the left menu

All requests must contain an `Authorization` header with your API token:

```
Authorization: Bearer {TOKEN}
```

### URL API — HMAC Signature

The URL API uses HMAC-SHA256 signed URLs for authentication. The URL format is `https://api.placid.app/u/{template_uuid}?{layer-name}[{property}]={value}&s={signature}`, where the signature is generated using your private API token and the query string via HMAC-SHA256.

### Editor SDK — JWT

The Editor SDK uses JSON Web Tokens (JWT) to handle authentication for its components. These tokens transfer a compact JSON object with a signed payload of your Placid API key and secret. The JWT payload includes fields like `exp` (expiration), `iat` (issued at), `sdk_token` (public token), `scopes`, and `editor_options`. The token is signed with your API secret using HMAC-SHA256. Alternatively, Placid provides a REST endpoint to generate a JWT token on your behalf.

## Features

### Image Generation

The Placid Image Automation API enables template-based, deterministic image generation from structured data. You provide a template UUID and fill its dynamic layers with content (text, images, colors, etc.). Generation is asynchronous — images are queued and can be retrieved via polling or webhook callback. You can also configure output filename, size modifications, and export options. A `create_now` option is available for synchronous generation. Generated images can be transferred directly to external storage (e.g., Amazon S3).

### PDF Generation

PDFs are generated from one or more templates used as pages, filling their layers with your data. The API allows you to create a PDF from one or more pages/templates, merged in the order you define. PDFs also support merging with existing static PDFs. Output can be transferred to external storage like S3 using a `transfer` object. Modifications to template defaults (like size) can be applied at generation time.

### Video Generation

Videos are generated from one or more templates used as clips, filling their layers with your data. The content of your video will be defined by an array of templates in your clips object. The API allows you to create a video from one or more clips/templates, merged in the order you define. You can fill picture layers with video files, fill text layers with values, and use animation and transition settings from the template editor. Audio tracks can be attached to clips with trim options. If multiple videos are used in a single clip, shorter ones loop automatically.

### Template Management

Templates can be listed, created, retrieved, updated, and deleted via the API. Templates can be filtered by collection ID or title, and sorted by creation date, update date, or title. New templates can be created from scratch (specifying width, height, title) or duplicated from an existing template. Templates support tags (up to 10) and custom data for referencing. Each template exposes its dynamic layers (text, picture, shape, browserframe, barcode, rating, subtitle) with configurable properties.

### Template Collections

Collections allow organizing templates into groups. Collections can be created, listed, retrieved, updated, and deleted via the API.

### Dynamic Layers

Templates contain dynamic layers that are populated at generation time. Supported layer types include:

- **Text**: Set text content, color, and font.
- **Picture**: Set image URL or video URL; supports webpage screenshot via viewport setting.
- **Shape**: Configure background color, border, border radius, and custom SVG.
- **Browserframe**: Render a URL as a webpage screenshot within a browser frame.
- **Barcode/QR Code**: Set a value to encode.
- **Rating**: Set a numeric rating value with color.
- **Subtitle**: Subtitle overlay for videos.

All layers share common properties like visibility (hide), opacity, rotation, position, and dimensions.

### Media Upload

The API provides a media upload endpoint for temporarily hosting files (images, etc.) on Placid's storage. Up to 5 files can be uploaded at once. The returned URLs can then be used in picture layers during generation.

### URL-based Image Generation

The URL API allows embedding dynamic image URLs directly (e.g., in HTML) that render images on the fly based on query parameters. Layer values are passed as URL query parameters, and the URL is authenticated via an HMAC signature.

### Export and Transfer

Generated creatives (images, PDFs, videos) can be automatically transferred to Amazon S3-compatible storage by providing credentials, bucket, region, and path in a `transfer` object on the generation request.

## Events

Placid supports per-request webhook callbacks rather than a global event subscription system. When creating an image, PDF, or video, you can provide a `webhook_success` URL in the request body. You can poll the GET endpoint for status updates or use a webhook to get the generated image.

### Generation Completed

- **Description**: When a queued image, PDF, or video has finished rendering, Placid sends a POST request to the `webhook_success` URL provided in the original creation request.
- **Parameters**: The `webhook_success` URL is specified per generation request. A `passthrough` field can be included to attach custom reference data that will be returned in the webhook payload.

Placid does not offer a global webhook subscription or event registration system. Webhooks are configured inline on each generation request.
