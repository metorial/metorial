# Slates Specification for Imejis.io

## Overview

Imejis.io is an API-based image generation platform that allows users to generate images with custom text, color, and image using pre-designed templates. It automates and scales marketing by generating custom images through a JSON API, allowing users to create social media graphics, e-commerce banners, and more using pre-designed templates or custom designs.

## Authentication

Imejis.io supports API key-based authentication. Imejis.io uses API keys for authentication.

- **API Key**: A valid API key from Imejis.io is required. Sign up on their website (https://www.imejis.io) and obtain your API key from the Developer Portal at https://app.imejis.io.

The API key can be passed in one of two ways depending on the endpoint used:

1. **Render API** (`https://render.imejis.io/v1/{DESIGN_ID}`): Pass the API key either as a `Bearer` token in the `Authorization` header or via the `dma-api-key` header.
   - Example with Bearer: `Authorization: Bearer YOUR_API_KEY`
   - Example with custom header: `dma-api-key: YOUR_API_KEY`

2. **Management API** (`https://api.imejis.io/api/...`): Pass the API key via the `dma-api-key` header.
   - Example: `dma-api-key: YOUR_API_KEY`

## Features

### Template-Based Image Generation

Generate images by sending a POST request with dynamic data to a pre-configured design template. A design ID from Imejis.io is required — select or create a design on the Imejis.io platform and make a note of its unique ID. The request body accepts a JSON payload with customizable component properties such as text content, colors, background colors, border colors, stroke colors, image URLs, and opacity. You can use nested objects, flattened keys with dot notation (e.g., `image.opacity`, `image.borderColor`), or combine both formats in a single request.

- The API returns the generated image as binary data (PNG) or a JSON response containing the image URL, depending on the endpoint used.
- Each component in the design template (text, image, shape, QR code) can be overridden via the API payload.

### Design Management

Imejis.io provides a List Designs API with a search parameter to filter templates by name or description. It supports pagination with cursors and configurable limits, allowing programmatic browsing of template libraries.

### AI Design Assistant

Imejis.io features an AI Design Assistant that can create new designs or update existing ones based on natural language prompts, making design creation accessible without manual template editing.

### QR Code Generation

Imejis.io supports QR code components, allowing you to generate dynamic QR codes directly in designs for seamless integration with URLs, contact information, and more.

### Text Patterns and Auto-Resize

Imejis.io supports text patterns that allow you to style specific portions of text using delimiters, enabling rich inline formatting like highlighted keywords, badges, and emphasized text without creating separate components. Additionally, it offers an auto-resize text feature, ensuring text fits perfectly within containers by scaling down or truncating.

### Public Pages and Sharing

Designs can be made public and shareable with a simple link. Public pages allow others to fill out forms and download generated images without needing direct API access.

## Events

The provider does not support events. There is no evidence of webhook subscriptions, event streaming, or purpose-built polling mechanisms in the Imejis.io API. Automation workflows are achieved through third-party integration platforms like Zapier rather than native event support.
