# Slates Specification for Renderform

## Overview

RenderForm is a template-based image and PDF generation API. It lets you create templates and generate images based on them with custom images, texts, QR codes, and more. It also allows you to take screenshots of any website, with the images automatically saved and hosted on a CDN.

## Authentication

Every request to RenderForm API requires an account and API Key.

Every request must include an `X-API-KEY` header with the API Key. The API Key is available in the account section in the API Keys tab.

Example:

```
X-API-KEY: <your-api-key>
```

No OAuth or other authentication methods are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Image and PDF Rendering

Render images and PDF files based on templates created in the Template Editor with dynamic properties. You provide a template ID and a data object containing component-level overrides (text content, colors, image sources, etc.).

- **Parameters:** Template ID (required), data key-value pairs for component properties, custom width/height for cropping, output format (PNG, JPG, PDF), custom file name, version (cache differentiator).
- A metadata field allows you to store any JSON object with the generated image.
- HTML templates can be rendered using the same endpoint. The only difference is that you skip the Component ID part as HTML templates don't have any components.
- Rendered results are hosted on RenderForm's CDN and returned as a URL.

### Template Management

Retrieve and list templates available in your account. You can get metadata and field definitions for a specific template by ID, or list all available templates with their preview URLs and configuration metadata. Templates support placeholders for text, images, and other dynamic content and can be created visually or with custom HTML/CSS.

### Render Results

List all your rendered results, including records of taken screenshots and generated images. This allows you to browse previously generated assets along with their access URLs and metadata.

### Website Screenshots

Take a screenshot of any website. The screenshot image will be automatically saved, and you will receive a link to it.

- **Parameters:** URL (required), width (required), height (required), waitTime (optional, 500–5000 ms delay before capture).
- You can pass a URL in the `webhookUrl` field so the API will accept your request and immediately return a response. Once processing is complete, a request will be sent to the given webhook URL.

## Events

RenderForm supports webhooks for notification of key actions.

### Render Complete

Triggered when the image or PDF is ready to download (action: `RENDER_COMPLETE`).

### Template Lifecycle

Webhooks can notify external services when a template has been created, updated, or deleted. Actions include `TEMPLATE_CREATE`, `TEMPLATE_UPDATE`, and `TEMPLATE_DELETE`. The payload includes the template ID, name, tags, and preview URL.

### Configuration

- Webhooks can be configured in the Webhooks configuration section of the RenderForm account and are triggered for all requests made to the API.
- You can also configure a webhook for a specific request by providing a `webhookUrl` parameter in the request body when rendering an image.
- You can create up to 10 global webhooks.
- Webhooks are always sent via POST request.
