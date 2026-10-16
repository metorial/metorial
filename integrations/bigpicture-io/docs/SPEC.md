# BigPicture.io Integration

## Overview

BigPicture.io provides company enrichment by domain and IP address. This integration exposes `enrich_company` and `resolve_ip`. Company-name resolution is discontinued and is not supported.

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

**Parameters:** Requires a `domain`. The optional `stream` flag defaults to `true`. Set it to `false` to use the standard endpoint; optionally supply `webhookUrl` and `webhookId` for asynchronous delivery.

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

### Result and Error Handling

Company results expose the provider's `id` as `companyId`. Nullable profile attributes stay nullable. Logo URLs are included when returned in the company profile. Both tools also expose `rawResponse`, preserving the original response before mapping or validation.

`enrich_company` reports `found: false` and `pending: true` for an HTTP 202 response; an HTTP 404 produces `found: false` without a pending state. `resolve_ip` reports `found: false` for HTTP 404. Other HTTP failures expose the provider status, error type, and error message. Standard lookups use a 30-second timeout; streaming requests allow 210 seconds for the documented 200-second response window.

Both tools are read-only. API keys have no documented expiry or refresh flow. The provider does not document an account/profile endpoint suitable for an identity tool.

## Events

BigPicture.io supports **webhooks** for asynchronous data delivery on the Company API.

### Company Lookup Completion

When a company enrichment request cannot be fulfilled immediately (data not cached or stale), you can supply a `webhookUrl` parameter. Once the enrichment process completes, BigPicture sends an HTTP POST to the provided URL with a JSON payload containing:

- `id`: an optional identifier (from the `webhookId` request parameter) to correlate the response
- `status`: 200 (success) or 404 (not found)
- `type`: the resource type (currently `company`)
- `body`: the full company profile data

This is the only event mechanism offered. There is no general-purpose event subscription or webhook registration system.

## Reference

[BigPicture API reference](https://docs.bigpicture.io/api/) documents authentication, errors, rate limits, company enrichment, asynchronous delivery, and IP resolution. BigPicture states that the existing enrichment APIs continue operating after its acquisition by SavvyIQ. This integration continues to use the BigPicture endpoints and credentials.
