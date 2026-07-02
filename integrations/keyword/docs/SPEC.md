Now let me get more details on the Keyword.com API endpoints and features:Now let me try to access the actual API documentation for more specific details:Based on my research, I now have enough information to write a comprehensive specification for Keyword.com. Let me compile everything.

# Slates Specification for Keyword

## Overview

Keyword.com (formerly Serpbook) is a keyword rank tracking and SERP analytics platform for SEO professionals, agencies, and enterprises. It provides accurate, real-time data on keyword positions, search intent, SERP features, and competitive share of voice in a single, scalable dashboard. Keyword.com also tracks brand visibility across all major AI search platforms, including ChatGPT, AI Mode, Perplexity, and Gemini.

## Authentication

Keyword.com uses **API token-based authentication** via secure HTTP headers.

- To use the API, you need an API token. Create an account on Keyword.com and retrieve your token under **Settings > Account tab** (https://app.keyword.com/settings/account).
- Authentication is done using secure headers — the API token is passed in the request header.
- The API is a RESTful API (referred to as "Google SERP Tracker API v2") and returns JSON responses.
- There are no OAuth flows or scopes; the single API token provides access to all resources associated with your account.

The Keyword.com API has two separate API products:

1. **SERP Tracker API** — for Google SERP keyword tracking, project management, ranking data, and share of voice metrics.
2. **AI Visibility Tracker API** — for AI search engine visibility tracking across ChatGPT, Perplexity, AI Overviews, and more.

## Features

### Project Management

Create and manage tracking projects that organize your keyword monitoring. Projects serve as the top-level container for grouping keywords, domains, and tracking settings. The API provides RESTful endpoints for managing projects and keywords.

### Keyword Rank Tracking

Choose your update frequency on keyword rankings — click and see your rankings update live. Track keyword positions across Google search results for specific domains. Track local keyword rankings with ZIP-code accuracy, including Google Business Profile results. Measure keyword rankings across desktop and mobile devices to accurately compare SERP performance.

- Configurable update frequency: daily, weekly, or on-demand.
- Location-level targeting down to city and ZIP code.
- Device type selection (desktop/mobile).

### SERP Data & History

Get top 100 search results and competitor URLs per keyword. The API gives full account exports and 30-day historical SERPs access. Discover if your keywords trigger a SERP feature. Identify what search intent is associated with your keywords.

### Share of Voice

Retrieve visibility scores for all tracked keywords. Quantify your search visibility against competitors at both the keyword and overall site level, as well as across mobile and desktop devices.

### Competitor Analysis

Discover who your competitors are for your keywords. Benchmark against other domains, identify threats, and track organic ranking fluctuations over time.

### AI Visibility Tracking

Track brand visibility across all major AI search platforms, including ChatGPT, AI Mode, Perplexity, and Gemini. Monitor visibility, sentiment, citations, and competitors to understand why they're ranking — and how to outperform them.

### Reporting & Data Export

Share live keyword performance reports with a link. Export ranking data in various formats for integration with dashboards, BI tools, or client reports. Agency-friendly features like white-label/embedded tables and customized exports to CSV/PDF.

### Search Volume & Intent Data

Understand the frequency of searches for specific terms. Access search intent classification for tracked keywords to understand user intent behind queries.

## Events

The provider does not support events. Keyword.com's API is a data-retrieval (pull-based) API and does not offer webhooks or purpose-built polling mechanisms for event subscriptions. Users benefit from access to automated alerts for significant ranking shifts, but these are platform-level notifications (e.g., email alerts) rather than developer-facing webhook or event subscription APIs.
