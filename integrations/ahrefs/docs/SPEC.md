Now let me get more details on the Ahrefs Connect OAuth flow for API v3:The page requires JavaScript. Let me search for more details.Now I have enough information to write the specification.

# Slates Specification for Ahrefs

## Overview

Ahrefs is an SEO toolset that maintains one of the largest web crawl indexes. Its API (v3) provides programmatic access to SEO data including backlink analysis, keyword research, organic traffic estimates, site auditing, rank tracking, SERP analysis, and AI brand monitoring.

## Authentication

Ahrefs supports two authentication methods depending on the use case:

### API Key (Bearer Token)

You need an API key to send requests via Ahrefs API v3. Provide it in the `Authorization` header when making requests: `Authorization: Bearer YOUR_API_KEY`.

Create and manage existing API keys in **Account settings / API keys**. Only workspace owners and admins have access to this section.

Each key has a lifetime of 1 year, after which it will expire and become inactive.

Ahrefs API is fully available for Enterprise plans. On all other plans, you'll have access to a limited set of free test queries.

### OAuth 2.0 (Ahrefs Connect)

For third-party integrations built through the Ahrefs Connect program, all API calls require authorization and are made on behalf of an authorized Ahrefs user. Your app must obtain an API access token for that user.

Use OAuth 2.0 to integrate authorization into your application. There are two variants depending on whether you're building a web application or a desktop application. For web applications, you'll need to implement a multi-step process involving generating a state parameter, redirecting users, handling callbacks, and exchanging authorization codes for access tokens. For desktop applications, the process is similar but simplified, with the access token provided directly in the callback.

The OAuth 2.0 flow for web applications involves:

1. Redirect the user to the Ahrefs authorization URL with a `state` parameter and your `client_id`.
2. The user authorizes the application.
3. The callback request will include the `code` parameter your application must use when requesting the access token.
4. Send a POST request to `https://ahrefs.com/oauth2/token.php` with `client_id`, `client_secret`, `code`, `grant_type=authorization_code`, and `redirect_uri`.
5. The response includes an `access_token`, `expires_in`, `token_type` (bearer), `scope` (api), and a `refresh_token` for obtaining new tokens.

Access tokens are passed as Bearer tokens in the `Authorization` header, the same as API keys.

## Features

### Site Explorer

Site Explorer provides overview stats and historical charts, backlinks, and organic and paid traffic reports. You can analyze any domain or URL to retrieve metrics such as Domain Rating, referring domains, organic traffic estimates, top pages, anchor text distribution, and new/lost backlinks. Data can be scoped by exact URL, domain, or prefix mode.

- **Target modes**: Exact URL, domain (with or without subdomains), or URL prefix.
- Retrieve both current snapshots and historical trends.

### Keywords Explorer

Keywords Explorer provides metrics for a single keyword or a list of keywords, search volume history and volume by country, and keyword ideas reports. Use this to research keywords, get difficulty scores, search volume data, click metrics, and discover related keyword suggestions.

- Supports querying individual keywords or bulk lists.
- Data is available segmented by country.

### SERP Overview

Retrieve the current search engine results page data for a given keyword, including the ranking URLs and their associated metrics. Useful for competitive analysis of specific search queries.

### Rank Tracker

Monitor keyword ranking positions over time for tracked projects. The API supports both reading rank data and managing Rank Tracker projects (creating, updating, deleting projects and tracked keywords).

- Management endpoints for projects and keyword lists are available and free of unit cost.

### Site Audit

Site Audit provides projects' Health Scores, full issue reports, and content of crawled pages. Access technical SEO audit data including crawl results, detected issues, and page-level details for your configured Site Audit projects.

### Brand Radar

Brand Radar provides brand overview stats, historical performance charts, and real prompts with citations across multiple AI agents. Monitor how your brand appears in AI-generated responses across different AI platforms.

### Management

Management endpoints allow you to manage your Rank Tracker projects and Keywords Explorer lists. These are free endpoints that let you create, update, and organize your tracking configurations programmatically.

## Events

There is no mention of webhook functionality in the Ahrefs API documentation. The Ahrefs API does not currently offer webhook functionality. The provider does not support events.
