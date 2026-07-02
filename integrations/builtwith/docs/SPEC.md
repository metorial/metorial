Now let me get more details on the Live Feed API and the financial API:# Slates Specification for BuiltWith

## Overview

BuiltWith is a web technology profiler that detects and tracks the technology stacks used by websites across the internet. It provides technology adoption data, ecommerce insights, and usage analytics across a database of over 250 million websites. The API enables programmatic access to technology lookups, lead generation, competitive analysis, trend tracking, and trust scoring.

## Authentication

BuiltWith uses API key authentication. The authentication process is straightforward — you simply append your API key to each request URL as a `KEY` query parameter.

To obtain an API key, sign up for an account at [builtwith.com/signup](https://builtwith.com/signup). After logging in, your API key will be displayed in the API documentation pages.

All API requests follow this general pattern:

```
https://api.builtwith.com/{api-version}/api.json?KEY=your-api-key&LOOKUP=example.com
```

There is no OAuth flow, token refresh, or additional authentication mechanism. The same API key is used across all BuiltWith API endpoints.

## Features

### Domain Technology Profiling

Provides XML, JSON, CSV, XLSX access to the technology information of a website, which includes all technical information as found on detailed lookups at builtwith.com and additional metadata where available. Returns current and historical technology usage including frameworks, analytics, widgets, CMS platforms, and more. Options include filtering to live technologies only, excluding metadata or PII, and filtering by first/last detected date ranges.

### Live Domain Detection

Allows you to do live technology lookups on a website, meaning when receiving the request BuiltWith will do a full technology index across that domain within a few seconds. This includes indexing internal pages, subdomains, tag managers, ads.txt, and technology versions.

### Technology Lists

Provides access to lists of websites using particular web technologies across the entire internet. Useful for lead generation — you can query for all sites using a specific technology (e.g., Shopify) and retrieve associated metadata including company names, social links, addresses, emails, and telephone numbers. Supports filtering by date (e.g., sites detected since a specific date).

### Website Relationships

Returns results of relationships between websites that show what sites are linked together, by what, and for how long. Useful for identifying related domains, shared ownership, and network analysis.

### Technology Trends

Provides access to the technology trends data found on BuiltWith Trends. Allows querying technology adoption over time, with the option to request historical totals as of a specific date.

### Company to URL Resolution

Resolves company names to their associated domain names. You can specify how many results to return and prioritize by TLD (e.g., `.com`, `.co.uk`) to match expected country.

### Keywords

Allows you to get access to keywords connected to websites. Supports multi-domain lookups (up to 16 domains at once).

### Trust & Fraud Detection

Uses attributes such as technology spend, time, relationships with other sites, current response, keywords, and undisclosed methods to determine the trustworthiness of a domain. Can perform live lookups and check for custom stopwords in website HTML.

### Redirects

Provides access to live and historical redirects for a website.

### Technology Recommendations

Suggests technologies for a website based on what other sites with similar technology profiles use.

### Tags

Returns lists of related domains based on IP addresses and other site attributes.

### Product Search

Finds websites selling specific eCommerce products by query term.

### Financial Data

Enables access to comprehensive financial data for websites listed on BuiltWith, provided in JSON format.

### Free Technology Summary

Provides last updated and counts for technology groups and categories for websites. This is a lighter, free-tier alternative to the full domain lookup.

## Events

BuiltWith offers a **Live Feed API** via WebSocket that streams real-time technology detections.

### Technology Detection Stream

Stream newly-detected domains in real time from the BuiltWith Live Feed WebSocket. You can either subscribe to all new detections or filter by specific technologies (e.g., subscribe to a channel for "Shopify" to only receive domains newly detected as using Shopify). The WebSocket endpoint is:

- All detections: `wss://sync.builtwith.com/wss/new?KEY=your-api-key`
- Technology-specific: `wss://sync.builtwith.com/wss/channel/{Technology}?KEY=your-api-key`
