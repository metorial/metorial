# Klazify API Integration

## Overview

Klazify turns websites, domains, IP addresses, and emails into categories, logos, social profiles, and company data. Available fields depend on the domain and subscription plan. Lookups use cached results by default; supported endpoints can request fresh data with refresh. Klazify category entries can include IAB V1 and V3 labels.

## Authentication

Klazify uses API key-based authentication. Users sign up to Klazify to get an API key and some credits to get started. The API key is generated from the Klazify account dashboard in the API section.

The API key is passed as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer YOUR_API_KEY
```

Klazify uses API keys for authentication. There are no OAuth flows, scopes, or additional credentials required. All API requests are made to `https://www.klazify.com/api/` endpoints with this single key.

## Features

### Website & Domain Categorization

Gives developers the ability to look up the categories of a particular URL, website, domain name, or IP address. Uses a machine learning engine to scan a website's content and meta tags, extracting text to classify the site and assign up to three categories aided by natural language processing.

- Three top-level category structures are available, including deep categorization via IAB taxonomy or simpler category structures.
- Each category includes a confidence score ranging from 0 to 1.
- Can categorize mobile apps using their Google Play Store or Apple App Store download URLs in real-time.
- Depending on the subscription plan, certain endpoints may or may not be available.

### Company Data Enrichment

Provides a full company profile from any URL or email, including revenue, employee range, industry classification, logos, tech stack, social media links, HQ location, and more.

- Input can be a domain URL or an email address.
- Revenue info is estimated and may be updated monthly for public companies (quarterly) or estimated based on location and employee count for private companies.

### Logo Retrieval

Retrieves the company logo found for a URL or domain, with optional refresh on paid plans.

- Returns a URL to the logo image.

### Social Media Links

Retrieves the list of social media channel links for a domain, with optional refresh on paid plans.

- Supported platforms include Facebook, Twitter, Instagram, Medium, YouTube, Pinterest, LinkedIn, and GitHub.

### Technology Stack Detection

Returns the technological stack utilized by the requested website.

### Competitors & Similar Domains

With one API call, returns a list of domains of potential competitors and similar domains, based on the category and target market of a given URL.

- Useful for market research and competitive analysis.

### Parked Domain Detection

Allows checking if a domain is actually parked and/or for sale. Some parked domains may show suspicious advertisements or redirect users to third-party websites that may be unsafe.

- Can be used for threat prevention and domain portfolio auditing.

### Domain Registration Data

The API returns domain registration information including domain age, registration date, expiration date, and days until expiration.

### IAB Labels and Category Lists

Retrieve the IAB V1/V3 taxonomy labels attached to category entries, or list the complete Klazify V1/V2 category paths. IAB identifiers are dynamic fields within each category entry.

### Domain Discovery

Search domains by category, headquarters country, technology, employee range, global traffic rank, text, or domain suffix. Results include pagination and company/traffic summaries. Counts are approximate, and suffix filtering may return a lower-bound total.

### Cache Refresh and Output Compatibility

Company, technology, logo, social, similar-domain, registration, and IAB lookups expose an optional refresh flag for paid plans. The all-in-one categorization endpoint does not support refresh. Company revenue ranges are returned as revenueRange; numeric revenue values remain in revenue. Domain day counts retain their text output contract. Logos remain available through their hosted URL and as downloadable images.

API reference: https://www.klazify.com/api-docs

## Events

The provider does not support events. Klazify is a request-response API for data enrichment and classification; it does not offer webhooks, event subscriptions, or built-in polling mechanisms.
