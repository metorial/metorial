Now let me look at the new unified Moz API documentation for complete feature coverage:# Slates Specification for Moz

## Overview

Moz is an SEO software company that provides tools for link analysis, keyword research, and domain authority measurement. The Moz API is a tool for users who want to analyze the internet search landscape, build custom dashboards or SEO reporting scripts, and enrich their own SaaS applications. The API provides programmatic access to the same data that powers Moz Pro's link and keyword research tools.

## Authentication

Moz supports two authentication methods:

### API Token (Current/Recommended)

To access the API, use a Moz API Token. To generate a token, access the Moz API dashboard at `https://moz.com/api/dashboard`, select "+ Add Token" to generate a new token, enter a description and click Create. When structuring your request, add your token as a header value with the key `x-moz-token`.

To authenticate requests, include a custom `x-moz-token` header with the value set to one of your API tokens every time you send a POST request to `https://api.moz.com/jsonrpc`.

### Basic Auth (Legacy)

If you were a user of the Moz API before March 2024, you can authenticate requests via Basic Auth over HTTPS. Use your 'Access ID' as a username, and your 'Secret Key' as a password.

All requests must use HTTPS. All requests are structured as JSON, and must be sent as POST requests to their respective endpoints.

## Features

### URL Metrics

Get metrics about one or more URLs, including Domain Authority, Page Authority, Spam Score, link counts, link propensity, and more. Supports bulk lookups for multiple URLs in a single request. Includes a link propensity score from 0 to 1 indicating the likelihood of a domain to link out to other root domains. Targets can be scoped to page, subdomain, or root domain level. Historical daily and monthly metric data is available.

### Link Analysis

Retrieve comprehensive lists of links pointing to any domain or URL, access anchor text used in backlinks, get detailed information about domains linking to your target, and discover linking opportunities by finding sites that link to competitors but not to you (Link Intersect). Results can be scoped to page, subdomain, or root domain. Links can be filtered by follow/nofollow status, internal/external, and HTTP status codes.

### Top Pages

Return a list of the top pages on a target domain. Top pages are identified as pages on a site with the most external links. The default sort is by descending Page Authority, but you can also sort by descending linking domains or inbound links. By applying filters, the API can return a list of broken pages (returning a 4xx status code) with links.

### Global Top Pages and Domains

Get the global top-ranking domains and pages across the internet. The global top pages endpoint returns the top 500 pages in the entire index with the highest Page Authority values.

### Keyword Research

Analyze search intent for keywords, get related keyword suggestions, get keyword difficulty scores (1-100), get keyword opportunity/CTR data, get keyword priority scores, and get keyword search volume data. These expanded endpoints include Keyword Metrics, Keyword Suggestions, Search Intent, Ranking Keywords, and Brand Authority.

### Brand Authority & Site Metrics

Get Brand Authority scores for domains and comprehensive site metrics (DA, PA, links, etc.). Get metrics for multiple sites at once and get keywords a site ranks for.

### Anchor Text Analysis

Retrieve anchor text data for links pointing to a target URL, subdomain, or root domain. Useful for identifying over-optimization issues or understanding how others reference your content.

### Index Metadata

Track when the index is updated with new data. When queried, the endpoint returns an ID that changes when the data in the index changes. This information helps understand the freshness of the data and can benchmark when new links are discovered.

### Usage Data

Monitor API usage via the Moz API Dashboard at `https://moz.com/api/dashboard` or programmatically via a usage data endpoint that reports how many API rows have been consumed within a given time period.

## Events

The provider does not support events. Moz's API is a data retrieval service with no webhook or event subscription mechanism. The Index Metadata endpoint can be used to detect when the link index has been updated, but this requires manual polling.
