Let me get more details from the API documentation.# Slates Specification for Imagior

## Overview

Imagior is an automated image generation software that enables businesses and creators to create and customize images using templates via API or No-Code solutions. It is suited for social media, marketing campaigns, and bulk pins. It can also be used to automatically generate certificates, product images, badges, and personalized social media graphics.

## Authentication

Imagior uses API keys for authentication. API keys are generated from the Developers page in the Imagior dashboard.

The API key must be included as a Bearer token in the `Authorization` header of every request:

```
Authorization: Bearer YOUR_API_KEY
```

Requests are made to the base URL `https://api.imagior.com`.

There are no OAuth flows, scopes, or additional credentials required. A single API key is sufficient for all API operations.

## Features

### Image Generation

Generate images based on a specified design template, requiring a template ID and optional element modifications to customize the output. The response includes a URL to the generated image along with its dimensions and format (PNG). Each image generated consumes one account credit (1 image = 1 credit).

- **templateId**: The ID of the design template to use.
- **elements**: An object of key-value pairs to override template element properties (e.g., text content, colors, image sources).

### Template Management

Retrieve all templates belonging to the authenticated user, with optional sorting by fields such as `updatedAt` or `createdAt`. Results can be ordered ascending or descending, defaulting to descending by `updatedAt`.

Templates are created and edited via the Imagior web dashboard editor, not through the API.

### Template Element Inspection

Retrieve the elements of a specific design template to understand its structure before generating images. Two levels of detail are available:

- **Full element properties**: Returns all properties of each element (dimensions, colors, fonts, positioning, opacity, etc.).
- **Basic element properties**: Returns a simplified view of element names and their basic properties.

This is useful for discovering which elements in a template can be customized during image generation.

### Account Details

Retrieve account information for the authenticated user, useful for checking remaining credits and account status.

## Events

The provider does not support events. Imagior does not offer webhooks or a built-in event subscription mechanism. Third-party platforms like Pipedream implement polling-based triggers (e.g., detecting new templates) but these are not native Imagior features.
