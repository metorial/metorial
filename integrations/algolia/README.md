# <img src="https://provider-logos.metorial-cdn.com/algolia-logo.jpeg" height="20"> Algolia

Search, index, and manage records and indices using Algolia's hosted search platform. Perform full-text search with typo tolerance, faceting, filtering, geo-search, and multi-language support. Configure index settings, searchable attributes, custom ranking, synonyms, and query rules. Track user events (clicks, conversions, views, purchases) to power analytics, personalization, and recommendations. Run A/B tests on index configurations. Generate product recommendations including related products, frequently bought together, and trending items. Manage API keys with fine-grained permissions and restrictions. Set up automated data ingestion pipelines from external sources. Crawl websites to extract and index content. Monitor infrastructure status, latency, and indexing performance.

## Tools

### Get Recommendations

Get personalized recommendations from Algolia Recommend. Supports multiple recommendation models including related products, frequently bought together, trending items, trending facets, and visually similar items. Multiple recommendation requests can be batched in a single call.

### Index Settings

Get or update settings for an Algolia index. Retrieve the full configuration of an index or update settings such as searchable attributes, faceting, custom ranking, replicas, and more.

### Manage A/B Tests

List, get, create, stop, or delete A/B tests in Algolia. A/B tests allow you to compare the performance of two index configurations (variants) by splitting traffic between them over a defined period.

### Manage API Keys

List, get, create, update, delete, or restore Algolia API keys. Manage access control for your Algolia application by creating keys with specific permissions, rate limits, and restrictions.

### Manage Indices

List, delete, copy, or move Algolia indices. Browse all indices in your application, remove an index permanently, duplicate an index (optionally scoping to settings, synonyms, or rules only), or rename/move an index to a new destination.

### Manage Records

Create, read, update, partially update, or delete records (objects) in an Algolia index. Also supports batch operations, clearing all records, and deleting records by filter criteria.

### Manage Rules

Manage query rules on an Algolia index. Get, search, save, batch save, delete, or clear rules. Query rules let you customize search results by pinning items, adding banners, filtering results, or modifying ranking for specific queries.

### Manage Synonyms

Manage synonyms on an Algolia index. Supports getting, searching, saving, batch saving, deleting, and clearing synonyms. Synonyms improve search relevance by mapping alternative words or phrases to each other.

### Monitoring

Check the operational status and performance metrics of Algolia infrastructure. Supports multiple metric types: - **status**: Current operational status of all Algolia clusters and servers. - **incidents**: Recent and ongoing incidents affecting Algolia services. - **latency**: Search latency metrics for your application's clusters. - **indexingTime**: Time taken to process indexing operations for your application. - **reachability**: Probe results indicating whether your application's servers are reachable from various locations. - **infrastructure**: Detailed infrastructure metrics (CPU, RAM, etc.) for your application's clusters. Supports an optional period parameter to control granularity.

### Search Analytics

Retrieve analytics data about search performance for an Algolia index. Supports multiple metric types: - **topSearches**: Most popular search queries, ranked by frequency. - **searchesCount**: Total number of searches over time, returned as a time series. - **topHits**: Most frequently returned (and clicked) hit objects across searches. - **noResultsSearches**: Search queries that returned zero results, useful for identifying content gaps. - **usersCount**: Number of unique users performing searches over time. - **clickRate**: Click-through rate on search results over time (requires click analytics events). - **conversionRate**: Conversion rate from search results over time (requires conversion analytics events). All metrics support date range filtering, result limiting, and analytics tag filtering.

### Search Index

Search an Algolia index with a query string and optional search parameters. Returns matching hits with highlighting, facet counts, pagination info, and other search metadata. Supports filtering, faceting, typo tolerance, attribute selection, and pagination.

### Send Events

Send Algolia Insights events to track user behavior such as clicks, conversions, and views. These events power Algolia's analytics, A/B testing, and AI features like personalization and dynamic re-ranking. Supports click events (with positions), conversion events (with purchase/addToCart subtypes and revenue data), and view events. Events can be tied to search queries via queryId for after-search analytics.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
