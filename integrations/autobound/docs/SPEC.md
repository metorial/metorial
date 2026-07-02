Now let me check the webhooks documentation:# Slates Specification for Autobound

## Overview

Autobound is a B2B sales intelligence platform that monitors 250M+ contacts and 50M+ companies for buying signals (job changes, funding, news, SEC filings, hiring trends, tech stack changes, etc.) and uses AI to generate personalized sales outreach content. It offers a REST API for content generation, prospect insight enrichment, signal data feeds, and a B2B contact/company database.

## Authentication

Autobound uses API key authentication. All API requests require an API key passed in the `X-API-KEY` header.

To generate an API key, navigate to **Settings > API** in your Autobound account. Add this key to your API requests.

The API key is included as a header in every request:

```
X-API-KEY: YOUR-API-KEY
```

Self-serve API keys can be generated directly within your Autobound account. Free credits are included with new API keys.

No OAuth2 or other authentication methods are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Personalized Content Generation

Generate AI-powered personalized sales content in multiple formats: single emails (with subject line), multi-step email sequences, call scripts with talking points and objection handling, LinkedIn connection requests (max 300 characters), and SMS messages. Additionally, you can generate email openers (opening lines) and fully custom content by defining your own output format using natural language instructions.

- **Contact resolution**: Identify the prospect via `contactEmail`, `contactLinkedinUrl`, or `contactCompanyUrl`.
- **Writing style**: Configurable styles such as `challenger_sale` and others to control the tone and approach.
- **Word count**: Override default lengths for any content type.
- **Additional context**: Provide freeform context (e.g., "I just left a voicemail") to influence output.
- **Sales assets**: Attach relevant collateral (case studies, product pages) for the AI to reference.
- **Insight control**: Enable or suppress specific insight categories (e.g., funding, hiring, social media) used in content generation.
- **Model selection**: Choose from multiple AI models (e.g., `opus`, `gpt4o`, `sonnet`, `fine_tuned`) trading off quality and speed.
- **Template rewriting**: Provide a "template to enrich," allowing Autobound to rewrite existing content rather than generate from scratch.
- **Sequence configuration**: For email sequences, specify the number of emails (defaults to 3).

### Prospect Insight Enrichment

Retrieve up to 25 ranked, personalized insights for any prospect with a single API call, delivered in structured JSON. Insights cover both contact-level and company-level data.

- **Company signals**: SEC filings (10-K, 10-Q, 8-K, 6-K, 20-F), earnings transcripts, news events, competitor news, hiring velocity/trends, employee growth, tech stack, financial signals, GitHub activity, Reddit mentions, patent filings, Glassdoor reviews, Product Hunt launches, SEO/traffic data, blog posts, LinkedIn/Twitter posts, and more.
- **Contact signals**: Job changes, LinkedIn posts/comments, Twitter posts, podcast appearances, work milestones, shared experiences with the seller, behavioral profiles, and YouTube videos.
- Optionally provide `userEmail` to improve insight ranking based on relevance to the seller.
- Filter by specific insight subtypes.

### Campaign Contact Import

Import prospects into AI Studio campaigns via API. Create a campaign in AI Studio, then use the campaign's unique ID to push contacts via API requests.

- Provide parameters to control what data is imported and used for content generation.

### Signal Data (Bulk)

License 25+ proprietary signal types (400+ subtypes) for your platform via API, GCS, or flat file delivery. Signal types include SEC filing analysis, earnings transcripts, Reddit sentiment, hiring data, GitHub activity, and more.

### B2B Contact and Company Database

Access to a database of 270M+ contacts and 11M+ companies for CRM enrichment and lead scoring, available via flat file delivery.

## Events

Autobound supports webhooks via its Signal API to push signal events to your endpoint in real time.

### Signal Events

When Autobound detects new signals matching your subscription criteria, it delivers them as HTTP POST requests to your registered endpoint. Each event contains the full signal payload including signal type, subtype, associated company/contact data, and detection timestamp.

- **Signal type filtering**: Subscribe to specific signal types (e.g., `work-milestones`, `news`, `8k`) or receive all types by omitting the filter.
- **Signature verification**: Each delivery includes an `x-autobound-signature` header (HMAC SHA-256) for payload authenticity verification using a signing secret provided at subscription creation.
- **Historical backfill**: Replay historical signals matching your subscription's filter to your endpoint from a specified date.
- **Delivery management**: View delivery logs, inspect failures, and replay individual failed deliveries. Failed deliveries that exhaust retries are stored in a dead-letter queue.
- **Subscription management**: Create, list, update (including pause/resume), and delete webhook subscriptions. Signing secrets can be rotated if compromised.
