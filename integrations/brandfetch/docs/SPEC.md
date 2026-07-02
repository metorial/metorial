# Slates Specification for Brandfetch

## Overview

Brandfetch is a brand data aggregation platform that provides programmatic access to company brand assets including logos, colors, fonts, images, and firmographic data. It supports lookups by domain name, stock/ETF ticker, ISIN, and cryptocurrency symbol, and can also resolve raw payment transaction descriptors to merchant brands.

## Authentication

Brandfetch uses two authentication methods depending on the API product:

### API Key (Bearer Token) — Brand API, Transaction API, Webhooks/GraphQL

Authentication is done by passing your API key as a Bearer Authentication. The API key is obtained by creating an account on the [Developer Portal](https://developers.brandfetch.com/register).

Example:

```
Authorization: Bearer <your-api-key>
```

This method is used for the Brand API (`api.brandfetch.io/v2/brands/...`), the Transaction API (`api.brandfetch.io/v2/brands/transaction`), and the GraphQL API (`graphql.brandfetch.io`).

### Client ID (Query Parameter) — Logo API, Brand Search API

To use Brand Search API, you must include your `clientId` with every request. Adding your `clientId` provides reliable access, supports fair usage, and keeps consistent performance across all requests.

The client ID is passed as the `c` query parameter. The same client ID is used for both Logo API and Brand Search API. Example:

```
https://api.brandfetch.io/v2/search/nike?c=BRANDFETCH_CLIENT_ID
https://cdn.brandfetch.io/nike.com?c=BRANDFETCH_CLIENT_ID
```

Both the API key and client ID are available from the Developer Portal after account registration.

## Features

### Brand Data Retrieval

Brand API provides programmatic access to any company's brand assets through a single API call. Returns logos (with light/dark theme variants), color palettes, fonts, images, company descriptions (short and long), and firmographic data (employee count, founding year, industry classification, company type, headquarters location). Also includes a quality score (0–1) indicating data reliability, and an NSFW flag.

- Brands can be queried by domain, stock/ETF ticker, ISIN, or cryptocurrency symbol. Explicit type routes (`/v2/brands/{type}/{identifier}` where type can be `domain`, `ticker`, `isin`, or `crypto`) are recommended to prevent collisions.
- Logos come in multiple types (icon, logo, symbol) and formats (SVG, PNG, WebP), with light and dark theme variants and descriptive tags (e.g., "photographic", "portrait").
- The Brand Search API is a free product.

### Logo CDN

Logo API is a CDN-based service for embedding brand logos directly in HTML via image URLs. It supports customizable dimensions, theme variants (light/dark), multiple logo types (icon, logo, symbol), output format selection (WebP, PNG, JPG, SVG), and smart fallback options (Brandfetch default, transparent, lettermark, or 404).

- Logos must be hotlinked (direct embedding required); caching/downloading is not permitted without a custom agreement.
- Supports the same identifier types as Brand API (domain, ticker, ISIN, crypto).

### Brand Search

Allows searching brands by name and returns matching brand domains and logos. Designed for building autocomplete experiences in user-facing applications.

- Must be used directly from client-side browsers (not server-side caching).
- Logo image URLs from search results expire after 24 hours and must be refetched.

### Transaction Enrichment

Resolves raw payment transaction descriptors (e.g., bank statement line items) to identified merchant brands with their logos, name, domain, industry, and other brand data.

- Requires a `transactionLabel` (the raw transaction text) and a `countryCode` parameter.
- Counts against Brand API usage quotas.

### GraphQL API

Brandfetch offers a GraphQL API for more flexible querying and for managing webhooks (creating, updating, subscribing).

- Available to Enterprise customers only.

## Events

Brandfetch supports webhooks to receive real-time notifications about brand data changes. Webhooks are available to Enterprise customers only and are managed via the GraphQL API. The implementation follows the Standard Webhooks v1 specification.

Webhooks require subscribing to specific brand URNs — you choose which brands you want to monitor.

### Brand Updated

Triggered when any of a brand's data is updated. Includes a `delta` property indicating which fields changed and their previous/new values.

### Brand Company Updated

Triggered when a brand's company-level data (firmographics, industry, etc.) is updated.

### Brand Claimed

Triggered when a brand is claimed by its owner on Brandfetch.

### Brand Verified

Triggered when a brand's data has been human-reviewed by the Brandfetch curation team.

### Brand Deleted

Triggered when a brand is soft-deleted, typically due to a take-down request by the brand's owner. This is exceedingly rare.
