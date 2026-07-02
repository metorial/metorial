Now let me look at the web search API and jobs API to complete my understanding:Now I have enough information to write the specification.

# Slates Specification for Crustdata

## Overview

Crustdata is a real-time B2B data platform that provides programmatic access to company and people data via APIs. It offers firmographic data and growth metrics for companies worldwide, drawing from over 16 diverse datasets including LinkedIn headcount, Glassdoor, Instagram, G2, web traffic analytics, App Store reviews, Google Play Store data, and news sources. It primarily serves builders of AI SDRs, AI sales platforms, AI recruiting platforms, investment/due diligence platforms, and internal sales or marketing tools.

## Authentication

Crustdata uses token-based authentication. Authentication is handled by passing your API token in the request header.

The token is passed via the `Authorization` header in one of two formats observed in the documentation:

- `Authorization: Token <your_token>` — used across most API endpoints as seen in official docs
- `Authorization: Bearer <your_token>` — referenced in some contexts

Example:

```
curl 'https://api.crustdata.com/screener/company?company_domain=hubspot.com' \
  --header 'Authorization: Token $auth_token'
```

API tokens are obtained by signing up for a Crustdata account. Access to certain fields may be restricted based on your user permissions; requesting fields you do not have access to will return an unauthorized access error.

## Features

### Company Enrichment

Retrieve detailed information about one or multiple companies using their domain, name, or Crustdata ID. Enriched data includes headcount metrics, employer reviews, product reviews, web traffic, news articles, and more.

- Look up companies by domain, name, or Crustdata company ID.
- The `fields` parameter allows customizing the response by specifying exactly which fields to retrieve.
- Supports real-time crawling — if a company isn't in the database, the system can fetch the data in real-time from the web via the `enrich_realtime` parameter.
- Provides access to over 250 data points per company, including funding, investors, headcount growth, web traffic, job openings, SEC filings, and product reviews.

### Company Search and Screening

The Company Discovery API allows screening and filtering companies based on various growth and firmographic criteria using complex filters.

- Filter by attributes like headcount, headcount growth rate, total funding raised, industry, region, investment stage, and more.
- Filters support logical AND operations with operators such as equals, greater than, less than, and inclusion/exclusion.
- Useful for building targeted prospect lists, market scans, and ICP-based company discovery.

### People Enrichment

Enrich data on individuals from multiple public sources. Offers People Enrichment and Social Posts APIs.

- Works with minimal input — a social media URL, email, or name and company combination. Matching algorithms find the right person and return available data.
- Returns employment history, education, social profiles, skills, and contact information.
- Supports multi-profile enrichment in one call and auto-enrichment for profiles not immediately found within 30–60 minutes.

### People Search

Search for detailed professional profiles based on custom filters.

- Supports 20+ filters including current company, current title, location, function, seniority, company type, and recent job changes.
- Multiple filters can be combined using logical AND operations.
- Supports a `post_processing` parameter to exclude specific profiles or names from results, useful for deduplication in outreach workflows.
- Can find people who recently changed jobs within a specified timeframe (e.g., last 30 days).

### Job Listings

Delivers structured, real-time job data including full descriptions and company context.

- Returns 30+ data points per listing including full job descriptions, job category, openings count, workplace type, reposted flag, and company context.
- Supports 35 search filters in a single call — query by job title, category, location, workplace type, department, and company attributes.
- Filter by job locations to find listings in countries or regions a company hasn't previously hired in, useful for detecting geographic expansion.

### Social Posts

Retrieve and search social media posts from people and companies in real time.

- Access recent posts published by a specific person (via LinkedIn URL) or company, including post content, engagement metrics (likes, comments, shares), and profile data of people who interacted.
- Search posts by keyword to monitor competitor launches, hiring signals, or specific topics.
- Data is fetched in real-time with latency between 30 to 60 seconds.

### Web Search

A search API designed for AI agents that returns structured, entity-linked data from the web mapped to canonical company/person entities.

- Search for real-time public information such as press releases, blog posts, podcast appearances, funding news, and product launches.
- Analyze SERPs around target companies, sectors, or keywords to detect shifts in market sentiment.
- Results are returned as structured JSON suitable for direct integration into AI workflows.

### Watcher (Monitoring & Subscriptions)

Subscribe to live updates about people or companies based on custom criteria. Set watches, get notified via webhooks, and act on fresh data.

- Trackable events include job changes and promotions, new funding rounds, significant headcount growth or decline, new job listings for specific roles, and company or key executive social posts.
- Set criteria-based watches such as "Notify me when anyone with 'Revenue Operations' in their title switches companies" or "Tell me if X company posts a GTM role in Europe."
- Track job postings that contain certain keywords in the title or description in a specific location.
- Notifications are delivered via webhooks to your specified endpoint.

## Events

Crustdata supports event subscriptions via its Watcher API, which delivers real-time webhook notifications.

### People Signal Events

Monitors changes such as a decision-maker switching jobs or profile updates. Includes:

- Job changes and role transitions
- Promotions
- Profile updates (new skills, certifications)
- New social media posts by tracked individuals

You can configure watches by specifying people (by LinkedIn URL or criteria) and the types of changes to monitor. Notifications are delivered as JSON payloads to your webhook endpoint.

### Company Signal Events

Track promotions, job changes, and funding rounds the moment they happen. Includes:

- New funding rounds
- Significant headcount growth or decline
- New job listings matching specific criteria (title keywords, location, department)
- Geographic expansion signals (hiring in new regions)
- Company social media activity

Configure watches by specifying companies (by domain or ID) and event types. Webhook endpoints should accept POST requests with JSON payloads containing person, event type, company, and timestamp details. Endpoints can be secured with auth headers, IP allowlists, or verification keys.
