# Slates Specification for Short Menu

## Overview

Short Menu is a URL shortening and link management platform available on Mac, iPhone, iPad, and via a REST API. It provides branded short links with custom domains, click analytics (geo-tracking, referrer data, device/browser detection), QR code generation, tagging, and link add-ons like UTM parameters and mobile/region redirects.

## Authentication

Short Menu uses **API Key** authentication. All API requests must include the `x-api-key` header with a valid API key.

- **Header:** `x-api-key: <Your-API-Key>`
- **API Key creation:** API keys can be created in the Short Menu dashboard at [shm.to/create-api-key](https://shm.to/create-api-key).
- **Base URL:** `https://api.shortmenu.com`

There are no OAuth flows, scopes, or additional credentials required. A single API key authenticates all requests.

## Features

### Link Management

Create, update, and delete short links programmatically. When creating a link, you specify the destination URL and the domain to use (either the default `shm.to` or a custom domain connected to your account). You can optionally provide a custom slug for the short link; if omitted, a random slug is generated. The slug must be unique within the chosen domain. When updating a link, you can change the destination URL without breaking the existing short URL.

- **Parameters:** `destinationUrl` (required), `domain` (required), `slug` (optional), `tags` (optional).
- The API is currently limited to link CRUD operations. There is no API endpoint for listing links or retrieving analytics data at this time — the API is noted as being in active development.

### Tagging

Assign one or more tags to short links for organizational purposes. Tags can be created on the fly — if a tag with the same name already exists, it is reused automatically. Tags can also be updated after link creation.

- **Parameters:** Each tag has a `name` and an `id`. When creating links, provide the tag `name`; do not pass `id` values unless the tag already exists in your account.

### Custom Domains

Use your own branded domain for short links instead of the default `shm.to` domain. Custom domains are configured in the Short Menu dashboard and can then be referenced by name when creating links via the API.

### QR Codes

Generate QR codes for any short link created with Short Menu's own domain or a custom domain. QR codes can optionally be unbranded on paid plans. Note: QR code generation is available through the apps and dashboard; it is not currently exposed via the API.

### Link Add-Ons

Enhance short links with UTM parameters for campaign tracking, social media thumbnail customization, mobile-specific redirects, and region-based redirects. Link expiration dates can also be set for time-sensitive campaigns. Note: These features are available through the apps and dashboard; they are not currently exposed via the API.

### Analytics

Track click counts, view traffic over configurable time periods, and analyze audience data including geographic location, referrer sources, browser, operating system, and device type. Analytics retention varies by plan. Note: Analytics are accessible through the apps and dashboard; they are not currently exposed via the API.

## Events

The provider does not support events. There are no webhooks or event subscription mechanisms available in the Short Menu API.
