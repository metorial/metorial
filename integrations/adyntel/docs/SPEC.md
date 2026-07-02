Now let me check the full documentation navigation to understand all available endpoints:Now I have enough information to write the specification.

# Slates Specification for Adyntel

## Overview

Adyntel is an ad intelligence API that retrieves publicly available advertising data from Google, Meta (Facebook & Instagram), LinkedIn, and TikTok ad libraries. It provides information on who's running paid ads, on which platforms, and what creatives they're using. It also offers keyword intelligence with estimation of budgets and CPC.

## Authentication

Adyntel uses API key-based authentication combined with the account email address. You can copy the API key from your Dashboard at any time. To authorize your calls you need to include the `api_key` as a query string alongside the other variables of your API call.

Each API request requires two credentials passed in the request body (as JSON):

- **`api_key`** (string): Your Adyntel API key, obtained from the dashboard at `platform.adyntel.com`.
- **`email`** (string): The email address used to register your Adyntel account.

Example request body: `{ "api_key": "hd-nndgi7gy6b3kdsgd-a", "email": "[email protected]", "company_domain": "tesla.com" }`

All requests use `Content-Type: application/json` headers and are sent as POST requests to `api.adyntel.com`.

Alternatively, for MCP integrations, credentials can be passed via HTTP headers: `X-Adyntel-Email` and `X-Adyntel-Api-Key`.

There are no OAuth flows, scopes, or token refresh mechanisms. Sign up at platform.adyntel.com. You'll get 50 free credits and an API key. No credit card is required.

## Features

### Meta (Facebook & Instagram) Ad Lookup

Retrieve all Facebook and Instagram ads for a given company. It takes a Facebook page URL or a company domain as input. Returns ad creatives, copy, CTA text, page information, and media assets. Supports a continuation token for retrieving additional results.

### Meta Ad Search

Search the Meta Ad Library using a keyword as input, with an optional country code filter to limit results geographically. Country codes use ISO 3166-1 alpha-2 format (e.g., US, GB, DE).

### LinkedIn Ad Lookup

Fetch LinkedIn ad creatives, impressions, and volume data. Track any company's paid LinkedIn strategy. Accepts a company domain or LinkedIn Page ID as input.

### Google Ads Lookup

Find all Google ads for a given company. It takes a company domain as input. Results can be filtered by media type with possible values: text, image, video. Returns ad creatives, advertiser information, format, start dates, and links to the Google Ads Transparency Center.

### Google Shopping Ads

Find all Google Shopping ads for a given company. This is different from the Google endpoint as it returns strictly shopping ads rather than search, image, or video ads. Results are retrieved asynchronously — a separate status endpoint returns the results using an ID received from the initial request. The status endpoint does not consume credits.

### TikTok Ad Search

Search for ads on TikTok using a keyword as the starting point. TikTok searches accept ISO 3166-1 alpha-2 country codes to filter by geographic region. Returns ad metadata including estimated audience, date ranges, and media.

### TikTok Ad Details

View all the details of a specific TikTok ad. This endpoint needs an "id" that you get in the response from the TikTok search endpoint. Returns detailed data including video URLs, image URLs, estimated audience size, and impression data.

### Paid vs. Organic Keyword Analysis

Get an overview of paid and organic keywords for a domain, with estimation of budgets and CPC included. Returns keyword position distribution, traffic estimates, estimated ad budget, and trends (new, up, down, lost keywords).

### General Considerations

- Adyntel doesn't provide exact spend figures since platforms don't disclose that publicly. Ad volume and budget estimates serve as proxies.
- Adyntel scrapes official platform transparency centers which reflect currently running or recently active campaigns. Data is as current as what Google, Meta, and TikTok publish in their public ad libraries.
- Each API call that successfully returns data uses 1 credit. Failed or empty lookups don't consume credits.
- All domain inputs must be in bare `company.com` format (no `https://` or `www.` prefix).

## Events

The provider does not support events. Adyntel is a stateless data retrieval API and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
