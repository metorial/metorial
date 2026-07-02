Based on the search results, "L2S" appears to be a URL shortening service with an API at `api.l2s.is`. Let me research it further.Now let me check the full API docs to see all available endpoints.Now I have enough information to write the specification.

# Slates Specification for L2s

## Overview

L2S (l2s.is) is a SaaS URL shortening platform that provides link shortening, QR code generation, and click analytics. It supports custom domains, UTM parameter tracking, team management, and tagging for organizing shortened URLs.

## Authentication

L2S uses **API key authentication** via Bearer tokens.

- **Type:** Bearer Token
- **Header:** `Authorization: Bearer <api_key>`
- **Obtaining a key:** API keys can be generated from the L2S integrations page at `https://app.l2s.is/integrations`.
- **Base URL:** `https://api.l2s.is`

All API requests must include the Bearer token in the `Authorization` header. There is no OAuth2 flow or additional scopes—a single API key grants access to all API functionality under the authenticated user's account.

## Features

### URL Shortening

Create shortened URLs from long URLs. Options include:

- **Custom key:** Specify a custom alias/slug for the shortened URL (e.g., `l2s.is/my-brand`).
- **UTM parameters:** Attach UTM tracking parameters (source, medium, campaign, term, content) directly when creating the short link.
- **Title:** Assign a descriptive title to the shortened URL.
- **Tags:** Attach tags for categorization and organization of links.

### URL Management

Retrieve and update details of existing shortened URLs by their ID. You can modify the destination URL, tags, UTM parameters, and other metadata after creation.

### Link Analytics

Track performance metrics on shortened URLs including click counts, user geolocation (country, city, state), device type, browser, operating system, and referrer data. This data is available through the platform's analytics features.

### QR Code Generation

Generate customizable QR codes for shortened URLs. QR codes share the same analytics tracking as the shortened links.

### Custom Domains

Brand shortened URLs with your own domain name instead of the default `l2s.is` domain.

### Team Management

Add team members to your account with role-based access and permissions, enabling collaborative link creation, management, and analytics viewing.

### User Settings

Retrieve the authenticated user's account settings and configuration.

## Events

The provider does not support events. The L2S API does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
