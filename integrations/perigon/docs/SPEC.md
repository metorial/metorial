Now let me get more details on the authentication and specific API features:The page didn't render fully. Let me fetch the API reference page for more details:The docs pages are JS-rendered and not fetching properly. I have enough information from the search results. Let me compile the specification.

# Slates Specification for Perigon

## Overview

Perigon is a news data API platform that provides structured, AI-enriched access to real-time and historical news articles from 200,000+ global sources. It offers endpoints for searching articles, story clusters, people, companies, journalists, media sources, and topics, with each article enriched with 25+ metadata points including sentiment, entities, categories, and summaries.

## Authentication

Perigon uses API key authentication. You obtain an API key by creating an account with Perigon Business Solutions at [perigon.io](https://www.perigon.io/).

The API key must be included with every request. It can be passed in one of two ways:

- **Query parameter**: Append `apiKey=YOUR_API_KEY` to the request URL.
  - Example: `https://api.perigon.io/v1/articles/all?apiKey=YOUR_API_KEY&source=cnn.com`
- **Bearer token header**: Pass the key as an `Authorization: Bearer YOUR_API_KEY` header.

The base URL for the API is `https://api.perigon.io/v1/`.

No OAuth or additional scopes are required. Access to specific endpoints and features depends on the subscription plan associated with the API key.

## Features

### Article Search

Search and retrieve individual news articles matching specific criteria. Supports keyword-based and semantic (contextual) search queries. Articles can be filtered by source, country, category, date range, location, sentiment, specific companies or people mentioned, and whether to include reprints. Each article response includes enriched metadata such as sentiment score, extracted entities, geographic tags, topic classification, and AI-generated summaries.

- **Key parameters**: query terms (with Boolean operators like AND/OR), source domain, country, category, date range, sort order, reprint exclusion.
- Semantic search understands query context beyond keyword matching.

### Story Clustering

Retrieve groups of related articles covering the same event or topic, organized as story clusters. Each cluster includes aggregate data such as the number of articles, overall sentiment, and a story summary. Useful for identifying trending stories, measuring coverage scope, and understanding how events are reported across multiple sources.

- **Key parameters**: same filtering options as article search.
- Results are returned at the story level rather than the individual article level.

### People Search

Search and retrieve information about public figures, politicians, celebrities, and other newsworthy individuals referenced in articles. Returns biographical information including occupation, position, and descriptions.

### Company Search

Search and retrieve profiles of companies and businesses referenced in articles. Returns company details including CEO information, employee count, industry classification, and business descriptions.

- **Key parameters**: company name, domain, industry.

### Journalist / Author Search

Search for journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their associated sources, locations, and publishing activity. Perigon maintains a database of 230,000+ journalists and systematically maps articles to their authors.

- Author matching is not available for every article.

### Media Source Search

Discover and retrieve information about the 160,000+ media sources indexed by Perigon. Sources can be searched by name, domain, location, or audience size. Returns details including monthly visits, top topics, and geographic focus.

### Topic Discovery

Search available news topics and categories supported by the Perigon API. Useful for discovering available categories and subjects to use as filters in article or story queries.

### Wikipedia Search

Search Wikipedia pages for information on any topic. Returns page summaries, content, categories, and metadata.

## Events

The provider does not support events. Perigon is a read-only data retrieval API with no webhook or event subscription mechanism.
