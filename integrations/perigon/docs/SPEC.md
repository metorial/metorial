# Perigon

Perigon provides structured news articles, related story clusters, entity profiles, media source data, topic discovery, Wikipedia search, and account usage information.

## Authentication

Create an API key in the Perigon developer dashboard. Requests authenticate using `Authorization: Bearer <API_KEY>` against `https://api.perigon.io/v1`. Endpoint and enrichment availability depend on the account plan. No OAuth or connection configuration is required.

## Tools

| Tool | Provider endpoint | Purpose |
| --- | --- | --- |
| `search_articles` | `GET /articles/all` | Keyword search and article lookup; source, entity, location, date, label, and sentiment filters. Returns article IDs, available article body, matched journalist IDs, and enrichment. |
| `search_stories` | `GET /stories/all` | Search story clusters and track updates, article counts, and mentioned entities. Pass `storyId` to article search as `clusterId`. |
| `search_people` | `GET /people/all` | Search public figures by name, Wikidata identifier, or occupation. Includes available position dates. |
| `search_companies` | `GET /companies/all` | Search companies by name, company ID, domain, stock symbol, industry, sector, or country. |
| `search_journalists` | `GET /journalists/all`, `GET /journalists/{id}` | Discover journalists by name, publication, coverage topic, and activity; retrieve an individual profile by ID. An explicit journalist ID selects direct lookup. |
| `search_sources` | `GET /sources/all` | Discover publishers by name, domain, group, topic, country, audience, publishing volume, and paywall status. |
| `search_topics` | `GET /topics/all` | Find topic names by name, category, or subcategory for subsequent content filtering. |
| `search_wikipedia` | `GET /wikipedia/all` | Search Wikipedia pages and revision dates. Returns page title, summary, available section text, and metadata. The language input accepts `enwiki`, or the shorthand `en`; the current reference supports English Wikipedia. |
| `get_account_usage` | `GET /limits` | Identify the connected organization and inspect request usage, account limits, and reset dates without consuming the monthly request quota. |

## Responses and pagination

Search tools retain their named result arrays and total-result counts. They also return the complete provider response as `raw`, including unavailable enrichment values and additional metadata. Optional enrichment is omitted from the named projection when absent or null; numeric zero, boolean false, and provider-supplied empty values remain unchanged. Source paywall status retains its nullable representation. Article label objects become label names. Wikipedia content combines the available raw section text in section order.

Pagination uses zero-based `page` and provider-controlled `size`; most endpoints default to 10 results and support up to 100 results per page. Account limits may vary. The provider normally caps pageable results at 10,000; use date ranges to retrieve larger histories. Totals may be capped by the provider rather than exact counts.

For compatibility, company and person searches retain the required name input and all existing source-group and sorting choices. The legacy story `date` sorting choice maps to creation time. The legacy story and source `language` inputs are forwarded unchanged for compatibility and have no documented filtering effect. Perigon documents language filtering only for articles; the current story and source parameter schemas omit it. The integration provides keyword search; it does not expose the separate semantic vector-search API.

## Provider references

- [API overview](https://perigon.io/docs/api/intro)
- [Authentication and errors](https://perigon.io/docs/api/authentication)
- [Official TypeScript SDK request routes and parameters](https://github.com/goperigon/perigon-ts/blob/main/src/apis/V1Api.ts)
- [Official TypeScript SDK response models](https://github.com/goperigon/perigon-ts/blob/main/src/models/index.ts)
- [Wikipedia](https://perigon.io/docs/api/wikipedia)
- [Account usage](https://perigon.io/docs/api/account-usage)
- [Pagination](https://perigon.io/docs/api/pagination)
- [Language filtering restriction](https://perigon.io/docs/api/languages)
