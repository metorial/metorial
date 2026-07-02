# Slates Specification for BigPicture.io

## Overview

BigPicture.io is a B2B company data provider with a database of over 20M+ company profiles. It offers enrichment APIs that convert domain names, company names, and IP addresses into detailed company profiles including firmographics, technographics, social media data, and financial metrics.

## Authentication

BigPicture.io uses **API key** authentication. An API key can be obtained by creating a free account at `https://app.bigpicture.io/signup` and accessing the key from the dashboard at `https://app.bigpicture.io/api`.

The API key must be included in the `Authorization` header of every request:

```
Authorization: {API_KEY}
```

The API key is secret and tied to credit-based billing, so it should be kept private.

## Features

### Company Enrichment by Domain

Look up a company by its domain name and receive a comprehensive company profile. The returned data includes:

- Basic info: name, legal name, description, founding year, type (public/private/nonprofit/government), phone, ticker symbol, logo
- Industry classification: sector, industry group, industry, sub-industry, NAICS code
- Tags and technology stack detected on the company's website
- Location and geo data (street address, city, state, country)
- Financial metrics: employee count, market cap, annual revenue, funding raised, Tranco/Alexa rankings
- Social profiles: Twitter, Facebook, LinkedIn, Crunchbase handles and metadata
- Domain aliases and email provider flag

**Parameters:** Requires a `domain`. Optionally accepts a `webhookUrl` and `webhookId` for asynchronous delivery.

**Considerations:** If a company's data is not already cached, the API returns a 202 status and the data must be retrieved later via polling, webhook, or the streaming endpoint. A streaming variant holds the connection open (up to 200 seconds) until data is ready.

### IP-to-Company Resolution

Identify the company associated with an IP address. Useful for de-anonymizing website traffic for sales, marketing, analytics, or personalization.

The response includes:

- The matched company profile (same schema as the Company API)
- Result type: `business`, `isp`, or `hosting`
- A confidence score (0–1) and a `fuzzy` flag indicating match quality
- IP geolocation data (city, state, country, continent, EU membership)
- WHOIS and ASN (Autonomous System Number) information

**Parameters:** Requires an `ip` address. Supports both IPv4 and IPv6.

### Company Logo Retrieval

Retrieve a company's logo image via a dedicated logo URL (`logo.bigpicture.io/logo/{domain}`). This is returned as part of company profile data.

### JavaScript Tracking SDK

A client-side JavaScript SDK for website visitor tracking and integration routing. It provides methods to:

- **Identify** users by associating traits (name, email, company) with visitor behavior
- **Track** custom events
- **Group** users into organizations or teams
- **Page** tracking for pageviews
- Selectively route data to specific downstream integrations (e.g., Google Analytics, Amplitude)

Data is persisted in local storage for returning visitors.

## Events

BigPicture.io supports **webhooks** for asynchronous data delivery on the Company API.

### Company Lookup Completion

When a company enrichment request cannot be fulfilled immediately (data not cached or stale), you can supply a `webhookUrl` parameter. Once the enrichment process completes, BigPicture sends an HTTP POST to the provided URL with a JSON payload containing:

- `id`: an optional identifier (from the `webhookId` request parameter) to correlate the response
- `status`: 200 (success) or 404 (not found)
- `type`: the resource type (currently `company`)
- `body`: the full company profile data

This is the only event mechanism offered. There is no general-purpose event subscription or webhook registration system.
