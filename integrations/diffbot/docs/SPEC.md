Now I have a comprehensive understanding of Diffbot. Let me check if they support webhooks or any event mechanisms.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Diffbot

## Overview

Diffbot is an AI-powered web data extraction and knowledge graph platform. It uses computer vision and natural language processing to automatically extract structured data from web pages, maintain a knowledge graph of over 10 billion entities (organizations, people, articles, products, etc.), and analyze natural language text for entities, facts, and sentiment.

## Authentication

All Diffbot APIs are authenticated via token. Diffbot uses API keys for authentication.

The token is passed as a query parameter (`token`) in every API request. For example:

```
https://api.diffbot.com/v3/article?token=YOURTOKEN&url=https://example.com
```

or for Knowledge Graph queries:

```
https://kg.diffbot.com/kg/v3/dql?token=YOURTOKEN&query=type:Organization
```

To obtain your API token, navigate to the dashboard home screen and click the link in the top right corner to access your token details page. There is no OAuth flow or additional scopes — the single token grants access to all APIs available on your plan.

## Features

### Web Page Extraction (Extract API)

Extract uses computer vision and natural language processing to automatically categorize and extract contents into clean, structured JSON. It supports multiple page types:

- **Analyze**: Automatically classifies a page and extracts data according to its type. Acts as an auto-router across the other extraction APIs.
- **Article**: Extracts title, author, date, full text, images, and more from news articles and blog posts.
- **Product**: Automatically extracts pricing, product specs, images, and more from e-commerce product pages.
- **Discussion**: Extracts threads and comments from forums and message boards.
- **Image**: Extracts primary images and metadata from pages.
- **Video**: Extracts metadata from video pages.
- **List**: Extracts list-style content from pages.
- **Event**: Extracts event details from event pages.
- **Job**: Extracts job posting details.

You can also POST markup or text directly for extraction when content is not publicly accessible.

### Custom Extraction Rules (Custom API)

A Custom API can be either an extended Extract API or a completely custom API. In both ways, manually defined rules set by CSS selectors are used to extract data from the page. This allows you to override or supplement the AI extraction when specific fields are not accurately extracted, or to define entirely new extraction schemas for specific domains using URL pattern matching.

### Knowledge Graph Search (DQL API)

Access a graph database of over 10 billion entities crawled and structured from all over the public web. The Diffbot Knowledge Graph is a self-updating graph database of the public web. Instead of websites, the Knowledge Graph represents web data in the form of real entities, like articles, organizations, and people.

- The Search or DQL API is one of two methods of accessing data from the Diffbot Knowledge Graph. The API takes a DQL (Diffbot Query Language) query, filters facts from the Knowledge Graph based on the instructions of that query, and returns a data response.
- Entity types include organizations, people, articles, products, discussions, and more.
- Results from the Knowledge Graph aren't just a list of names — they're complete records with 50+ fields and properties.

### Entity Enrichment (Enhance API)

The Enhance API takes an input of just a few identifiers about a person or organization and returns all the knowledge the public web has on that entity. You can look up organizations by name, domain, or other identifiers, and people by name, employer, email, etc.

- A **Combine** endpoint returns both person data and their current employer data in one call.
- **Bulk Enhance** allows enriching large batches of records at once by submitting a bulk job.

### Natural Language Processing (Natural Language API)

Extracts entities (e.g., people, organizations, products) and data about them (e.g., sentiment, relationships) from raw text.

- Identifies entities and links them to Knowledge Graph records.
- A fact defines a relationship between entities (e.g., Apple Inc; founder; Steve Jobs) or an entity and a literal (e.g., Apple Inc; number of employees; 137,000).
- Extracts sentiment at the entity level.
- Supports multiple languages, though feature support varies by language.

### Web Crawling (Crawl API)

Allows spidering entire websites or domains, processing discovered pages through any of the Extract APIs. You can configure seed URLs, URL filtering patterns, crawl depth, and processing limits. Crawls can be recurring to detect new content over time.

### Bulk Extraction (Bulk API)

Processes a large list of known URLs through any Extract API as a batch job. Useful when you already have the URLs and don't need crawling/spidering.

## Events

Diffbot offers limited webhook support, specifically for Crawl and Bulk API jobs:

### Crawl/Bulk Job Completion

Pass a URL to be notified when the crawl hits the maxToCrawl or maxToProcess limit, or when the crawl completes. The webhook delivers a POST with `X-Crawl-Name` and `X-Crawl-Status` in the headers, and the full JSON response in the POST body.

- Configured via the `notifyWebhook` parameter when creating a Crawl or Bulk job.
- Triggers when the job completes or hits configured processing limits.

Diffbot does not offer general-purpose webhooks or event subscriptions for other API features (e.g., Knowledge Graph changes or extraction events).
