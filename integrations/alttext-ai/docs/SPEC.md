Now let me look at the actual API documentation to get more specific details about the endpoints and webhook support.Let me try to find the specific API reference docs page.Now I have enough information to compile the specification. Let me construct it based on all the gathered data.

# Slates Specification for AltText.ai

## Overview

AltText.ai is an AI-powered service that automatically generates alternative text (alt text) for images. It accepts images via URL or file upload and returns descriptive alt text. It supports 130+ languages and is designed to improve web accessibility and SEO.

## Authentication

AltText.ai uses API keys for authentication.

- **API Key**: Passed via the `X-API-Key` HTTP header on every request.
- **Base URL**: `https://alttext.ai/api/v1`
- API keys are required for all integrations and the Developer API. An API key ties the integration to your account.
- You can create as many API keys as you want. Typically one key per integration is recommended, as this allows you to shut off access to a single integration if needed, and set per-key credit limits per billing period.

**How to obtain an API key:**
Go to the Account: API Keys tab in your AltText.ai dashboard. Click the "+ API Key" button to create a new key.

**Example request:**

```
curl -X GET https://alttext.ai/api/v1/account \
  -H "X-API-Key: your_api_key_here"
```

## Features

### Alt Text Generation

Generate alt text for a single image by making a POST request to `https://alttext.ai/api/v1/images` with an image URL. Images can also be provided via file upload.

- **Language**: The `lang` parameter can be sent in the image create request to generate alt text in any of 130+ supported languages.
- **Maximum length**: You can control alt text formatting and enforce a maximum character length.
- **SEO Keywords**: Custom keywords can be included to be used during processing, improving search engine optimization of the generated text.
- **E-commerce data**: Product names, brands, and descriptions can be provided to generate more contextually relevant alt text for product images.
- **AI Writing Style**: Configurable tone options including Elaborated, Standard, Matter-of-fact, Concise, or Terse.
- **Supported formats**: Standard formats (JPG, PNG, GIF, WebP, BMP) use 1 credit. Advanced formats (AVIF, HEIC, HEIF, JP2, SVG, TIFF) use 2 credits and require a paid plan.
- All images must be less than 16MB in size and at least 50x50 pixels.

### Bulk Alt Text Generation

A bulk creation endpoint accepts CSV files for processing multiple images at once. This is useful for migrating large image libraries or processing entire product catalogs.

### ChatGPT Post-Processing

When ChatGPT modification is enabled, the system first generates alt text using standard AI models, then processes that text through ChatGPT using a custom prompt to refine it.

- Custom prompts must include the `{{AltText}}` macro, which is replaced with the initial alt text when sent to ChatGPT.
- ChatGPT modification does not see the image. It only receives the already-generated alt text and modifies it based on your prompt.

### Account Information

The API exposes an account endpoint (`/api/v1/account`) to retrieve account details such as plan information and credit usage.

### Image Library

All images processed by AltText.ai can be managed in an image library. The library allows exporting to CSV, manually editing alt text, and searching for specific keywords or phrases.

### Asynchronous Processing via Webhooks

You can run alt text jobs in the background and be notified via webhooks when alt text has been generated. A webhook URL can be provided when submitting an image for processing.

## Events

AltText.ai supports webhooks for asynchronous notification of completed alt text generation.

### Alt Text Generated

When submitting an image for processing, you can provide a webhook URL, and AltText.ai will notify you via that webhook when the alt text has been generated. This is a per-request callback mechanism — the webhook URL is specified at the time of image submission rather than as a global subscription.

- Useful for background/batch processing where you don't want to wait synchronously for results.
- The webhook delivers the completed alt text result for the submitted image.
