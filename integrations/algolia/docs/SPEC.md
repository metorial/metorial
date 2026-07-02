# Slates Specification for Algolia

## Overview

Algolia is a search-and-discovery API platform that provides hosted full-text search, analytics, and recommendation capabilities. The Algolia Search API lets you search, configure, and manage your indices and records. The platform includes API clients for Search, Recommend, Analytics, A/B testing, and Personalization.

## Authentication

Algolia uses API key-based authentication. API keys are necessary to work with Algolia. They give code-level access to your account, data, and index settings. You need a valid API key to send or update your data, search your index, or do anything else with Algolia's API.

**Required Credentials:**

- **Application ID**: A unique identifier for your Algolia application.
- **API Key**: A key with the necessary permissions (ACL) for the operations you want to perform.

You can find your application ID and API key in the Algolia dashboard.

API requests are authenticated by passing two HTTP headers:

- `x-algolia-application-id`: Your Algolia Application ID
- `x-algolia-api-key`: Your API key

**API Key Types:**

Algolia comes with a set of predefined API keys, the most important being the Admin API key and the Search-only API key. Your Admin API key is your most sensitive key and should remain confidential. Algolia provides a search-only API key that lets you search your data. It works on all your Algolia application indices and is safe to use in your production frontend code.

You can also create custom API keys with specific ACL permissions, including: `search`, `browse`, `addObject`, `deleteObject`, `deleteIndex`, `settings`, `editSettings`, `analytics`, `recommendation`, `usage`, `logs`, and `seeUnretrievableAttributes`.

**Key Restrictions:**

Every key can have one or more of the following restrictions: Indices (the indices that are accessible), Rate limit, Records retrieved, Validity (expiration time), HTTP referrers, and Query parameters.

**Secured API Keys:**

Secured API keys are derived from one of your main API keys. They inherit the rights and restrictions of their base API keys, which they can't override. Secured API keys are virtual, which means they aren't stored anywhere, and you can't find them on the Algolia dashboard. Generate them as needed for circumstances like granting temporary access or giving users access to a subset of data.

**Region Configuration:**

Some APIs (Analytics, A/B Testing, Insights, Ingestion) require specifying an analytics region: `us` (United States) or `de`/`eu` (Europe). You can check your analytics region in the Infrastructure > Analytics section of the Algolia dashboard.

## Features

### Search and Indexing

Create, update, and delete indices and documents. This covers batch operations, object updates, and managing index settings. Perform searches with configurable query parameters, sorting, and filtering, including advanced search features like typo tolerance and faceting. Supports geo-search, highlighting, snippeting, and multi-language support.

### Index Configuration and Rules

Configure index settings including searchable attributes, custom ranking, faceting, filtering, and relevance tuning. Define synonyms to improve search recall. Create rules that let you customize search behavior for specific queries, such as pinning/hiding results, boosting categories, or adding banners.

### Analytics

Algolia provides analytics tools to monitor search performance and user behavior. Use the API to access and interpret search analytics data. Click and conversion analytics provide insights into actions users take after performing a search.

### Insights (Event Tracking)

Collect events related to your search and discovery experience. Send click, conversion, view, add-to-cart, and purchase events tied to search queries and user tokens. These events power features like Dynamic Re-Ranking, Recommend, and Personalization.

### A/B Testing

The A/B testing API lets you test two alternative index configurations and see which performs best. Create, manage, stop, and delete A/B tests. Test things like enabling personalization, re-ranking, rules, facet re-ordering and many other settings.

### Recommendations

Supports trending items, trending facets, related products, frequently bought together, looking similar, and other recommendation types. The Recommend API uses event data and machine learning models to generate product or content recommendations.

### Personalization

Leverage user event data (clicks, conversions) to personalize search results per user. Configure a personalization strategy that adjusts result ranking based on individual user affinity profiles.

### Data Ingestion

The Ingestion API allows configuring automated data pipelines to index data from external sources. Define sources, destinations, authentication resources, and scheduled or triggered tasks to keep indices up to date.

### Crawler

A hosted web crawler that extracts and structures website content for indexing into Algolia. A fast, low-code and easy way to crawl your data and index in Algolia. Simplify the data ingestion process and eliminate the need to build and maintain indexing pipeline. The Crawler has its own separate credentials (Crawler User ID and Crawler API Key).

### API Key Management

Create, view, and manage your main API keys from the dashboard and the API. Generate secured (virtual) API keys from parent keys with additional restrictions for use cases like per-user access control.

### Monitoring

Access infrastructure status and metrics for your Algolia application, including server status, latency, and indexing performance.

## Events

The provider does not support webhooks or built-in event subscription mechanisms. Algolia does not offer outbound webhooks to notify external systems of changes to indices, records, or other resources. It is primarily a consumer of events (via the Insights API) rather than a producer of them.
