# Slates Specification for Logo.dev

## Overview

Logo.dev is an API service that provides access to company logos from a database of tens of millions of companies. It provides company logos, brand colors, social links, and brand data from domains. It supports looking up logos by domain, stock ticker, crypto symbol, ISIN, and company name, as well as searching for domains by brand name.

## Authentication

Logo.dev uses API key authentication with two types of keys:

- **Publishable Key** (prefixed `pk_...`): Publishable keys are automatically secured for safe client-side use. They can be used anywhere — browsers, mobile apps, client-side code. They only work with the `img.logo.dev` image CDN. The publishable key is passed as a `token` query parameter on image URLs:

  ```
  https://img.logo.dev/shopify.com?token=YOUR_PUBLISHABLE_KEY
  ```

- **Secret Key** (prefixed `sk_...`): Required server-side only for search, describe, and other API endpoints. Never expose this key. The secret key is passed as a Bearer token in the `Authorization` header:
  ```
  Authorization: Bearer YOUR_SECRET_KEY
  ```

Both keys can be viewed and managed in the Logo.dev dashboard at `https://www.logo.dev/dashboard`. To rotate keys, contact support@logo.dev to have new keys generated.

## Features

### Logo Image Retrieval

Retrieve company logo images via a CDN-based image URL. Logos can be looked up by domain (e.g., `shopify.com`), stock ticker (e.g., `AAPL`), cryptocurrency symbol (e.g., `BTC`), ISIN (e.g., `US0378331005`), or company name.

- **Format**: Supports `jpg` (default), `png`, and `webp`. SVG is available on Enterprise plans only.
- **Size**: Configurable via a `size` parameter (default 128px, max 800px).
- **Theme**: A `theme` parameter (`dark` or `light`) adjusts logo colors for visibility on different backgrounds.
- **Greyscale**: A `greyscale` parameter desaturates logos, useful for normalizing colors on landing pages.
- **Retina**: A `retina=true` parameter doubles image resolution for high-density displays.
- **Fallback**: When no logo is found, returns a monogram by default. Can be set to `fallback=404` to return a 404 instead.

### Brand Search

Search for company domains by brand name with autocomplete support. Returns up to 10 results sorted by popularity.

- **Query**: The brand name to search for.
- **Strategy**: `typeahead` (default, prefix-forward matching for autocomplete UX) or `match` (exact/near-exact name matching).
- Requires a secret key. Returns an array of objects containing company name and domain.

### Brand Describe (Enrichment)

Retrieve comprehensive brand data for a given domain, including company name, description, logo URL, brand colors, blurhash placeholder, and social media links.

- Supported social sites include Facebook, GitHub, Instagram, LinkedIn, Pinterest, Reddit, Snapchat, Telegram, Tumblr, Twitter/X, WeChat, WhatsApp, and YouTube.
- Returns prominent brand colors as RGB and hex values.
- Returns a blurhash string for generating blurred placeholder images while logos load.
- Requires a secret key and is available on paid plans only.

## Events

The provider does not support events.
