# Slates Specification for U301

## Overview

U301 is a URL shortening and link management service. It allows users to create shortened URLs using custom domains, generate QR codes, and track link performance. The platform also supports Link-in-bio pages.

## Authentication

All API endpoints are authenticated using Bearer tokens, except for some specific endpoints that allow both authenticated and anonymous users to access them.

- **Method:** API Key (Bearer Token)
- **Header:** `Authorization: Bearer <api_key>`
- **Obtaining a key:** Create your API key in the dashboard at `https://u301.com/dashboard/settings/api-key`. The key will start with the prefix `oat_`.
- **Expiration:** It is recommended to set an appropriate expiration time for your API key to enhance account security.
- **Base URL:** `https://api.u301.com/v2`

Note: Some endpoints (URL shortening and QR code generation) can be used without authentication (anonymous mode), but results will be associated with an anonymous account rather than your own.

## Features

### URL Shortening

Create shortened URLs from long links. If the same long URL has already been shortened within the same account, the previously shortened URL is returned.

- **Parameters:**
  - `url` (required): The long URL to shorten (must include `http://` or `https://`).
  - `domain`: Specify a custom domain for the short link (e.g., `go.example.com`).
  - `slug`: Custom alias for the short link (letters, numbers, underscores, hyphens only; must be unique).
  - `title`: A descriptive title for the link.
- **Considerations:** The shortening endpoint can be used without authentication, but the link will belong to an anonymous account and cannot be managed later.

### Link Deletion

Delete a previously created short link by its identifier.

- Requires authentication.

### Custom Domain Management

List all available domains for URL shortening, including system-provided public domains and user-added custom (private) domains.

- **Parameters:**
  - `visibility`: Filter by `public` (system domains), `private` (your custom domains), or `all`.
- **Considerations:** Custom domains must first be added and verified via the U301 dashboard by configuring a CNAME DNS record.

### QR Code Generation

Generate a QR code (SVG format) for any shortened URL.

- **Parameters:**
  - `url` (required): The shortened URL.
  - `width`: QR code width.
  - `margin`: QR code padding.
  - `level`: Error correction level (`L`, `M`, `Q`, `H`; default `M`).
  - `dark` / `light`: Hex color values for foreground and background.
- **Considerations:** Only SVG format is currently supported. This endpoint does not require authentication.

## Events

The provider does not support events.
