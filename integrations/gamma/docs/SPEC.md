Now let me check for more details on the API, especially around text modes and webhooks/events:Now I have comprehensive information about Gamma's API. Let me check if there are any webhook or event mechanisms:I now have all the information needed. Gamma does not support webhooks or event subscriptions based on the API documentation. Let me compile the specification.

# Slates Specification for Gamma

## Overview

Gamma is an AI-powered content creation platform that generates presentations, documents, social media posts, and websites from text prompts or existing templates. It uses AI to produce professionally designed content with auto-generated text, layouts, and images, supporting 60+ languages.

## Authentication

Gamma uses **API key** authentication.

- **Requirement:** A Gamma Pro, Ultra, Team, or Business subscription is required to access the API.
- **Generating a key:** Navigate to **Settings and Members** in your account, go to the **API key** tab, and click **Create API key**.
- **Key format:** Keys follow the format `sk-gamma-xxxxxxxx`.
- **Usage:** Pass the API key via the `X-API-KEY` HTTP header (not as a Bearer token in the Authorization header).
- **Base URL:** `https://public-api.gamma.app/v1.0/`

There is no OAuth2 flow or other authentication method. Only API key authentication is supported.

## Features

### AI Content Generation from Scratch

Generate presentations, documents, social media posts, or webpages from text input. The input can range from a brief one-line prompt to extensive structured notes (up to ~400,000 characters). Three text modes control how input is handled: **generate** (expand and rewrite), **condense** (summarize), or **preserve** (keep text as-is). Additional options include specifying tone, target audience, language, and the number of cards/slides.

- **Format options:** presentation, document, social post, or webpage.
- **Card dimensions:** Configurable aspect ratios (e.g., 16:9, 4:3, letter, A4, 1:1, 9:16) depending on format.
- **Card splitting:** Content can be automatically divided into a specified number of cards, or split at explicit text breaks in the input.
- Additional instructions can be provided to steer output content and layout.

### Template-Based Generation

Create content based on an existing Gamma document (template). Provide the ID of an existing gamma along with a prompt describing how to rework or adapt it. This is useful for producing personalized variations of a master template at scale (e.g., customized pitch decks per client).

### Image Configuration

Control how images are sourced for generated content. Options include AI-generated images (with configurable model and artistic style), stock photos from Pexels or Pictographic, GIFs from Giphy, web images (with licensing filters), placeholders, or no images. Users can also embed their own image URLs directly in the input text.

### Theming

Apply visual themes that control colors, fonts, and overall look. Themes can be standard Gamma themes or custom themes created in the app. A List Themes endpoint is available to retrieve theme IDs. Themes must be pre-created in Gamma and cannot be created via the API.

### Headers and Footers

Customize card headers and footers with text, images (theme logo or custom URL), or card numbers. Six positions are available (top-left/center/right, bottom-left/center/right), and visibility on first/last cards can be controlled.

### Export

Generated content can be exported directly as **PDF** or **PPTX** files in addition to receiving a Gamma web URL. Export links are temporary and must be downloaded promptly.

### Sharing and Access Control

Configure workspace-level and external access permissions (no access, view, comment, edit, full access) on generated content. Content can also be shared via email to specific recipients with configurable access levels.

### Folder Organization

Organize generated content into folders. A List Folders endpoint is available to retrieve folder IDs. Users must be a member of a folder to add content to it.

## Events

The provider does not support events. Gamma's API does not offer webhooks, event subscriptions, or any purpose-built polling mechanism. Generation status is checked by polling the GET generation endpoint for completion.
