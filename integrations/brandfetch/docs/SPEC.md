# Brandfetch Integration

## Authentication

The existing `api_key` connection accepts an API key plus an optional Client ID. The API key is sent as `Authorization: Bearer <key>` to the Brand API, Brand Context API, Transaction API, and Viewer API. Brand Search requests and Logo URLs instead include the Client ID as the `c` query parameter. Both values come from the [developer dashboard](https://developers.brandfetch.com).

The configuration schema is empty. No tenant or organization ID is required during setup. There is no OAuth refresh flow. The connection's existing API key requirement remains unchanged, including for the Client ID products.

## Tools and products

| Product | Tool | Behavior |
| --- | --- | --- |
| Brand API | `get_brand` | Retrieve brand assets and company data by automatic or explicit identifier type. Optional `allowNsfw`, `cachedOnly`, and `palette` match documented query parameters. |
| Brand Context API | `get_brand_context` | Retrieve the complete structured context, including identity, positioning, products, voice, visual style, and competition. |
| Brand Search API | `search_brands` | Search names and return matching Brand IDs, domains, names, and icon URLs. |
| Transaction API | `enrich_transaction` | Resolve a raw descriptor and country code to a merchant's full brand response. |
| Logo API | `get_logo_url` | Build a direct embedding URL with dimensions, theme, type, fallback, format, and an optional explicit identifier type. |
| Shared identity | `who_am_i` | Call the free Viewer endpoint for credential identity, organization, and current credit usage. |

The five API products have separate tool categories. Viewer identity is shared and uncategorized. Responses preserve the complete original provider data through `raw` on existing retrieval tools and `context` on the context tool. Asset URLs remain metadata; Logo URLs are for embedding, and the provider prohibits programmatic fetching of its CDN images without an agreement.

`get_brand` treats a cached-only `204` as an actionable error asking the caller to retry without `cachedOnly`; it does not invent an empty brand. The new context tool returns `found: false` for its documented cached-only `204`. Context generation can return `503`; the API error message explains when to retry. Search has no pagination parameters. API errors retain provider messages, status, and body error codes.

## Response compatibility

All four original keys, input types and constraints, and output scalar types are retained. Existing optional logo dimensions omit provider nulls in their numeric projection; the original nulls remain in `raw`. Industry parent data accepts the documented parent array, maps its first entry to the existing singular parent fields, and retains all original parents in `raw`.

The following legacy outputs become optional because the official API permits null values or a structured value that cannot satisfy the old type. Existing nonnull strings and complete numeric weight arrays are returned unchanged. No empty strings, zero values, or filtered numeric arrays are manufactured.

| Tool output | Existing type retained | Official OpenAPI pointer under `components.schemas` |
| --- | --- | --- |
| `get_brand.brandName` | string | `BrandResponse.properties.name` (`nullable: true`) |
| `enrich_transaction.brandName` | string | `BrandResponse.properties.name` (`nullable: true`) |
| `get_brand.fonts[].name` | string | `BrandResponse.properties.fonts.items.properties.name` (`nullable: true`) |
| `get_brand.fonts[].weights` | number[] | `BrandResponse.properties.fonts.items.properties.weights.items` (`type: object`; documented sample `[{}]`) |

The `weights` projection is included only when the complete upstream array consists of numbers, including an actual empty array. Otherwise, the whole legacy projection is omitted, and the entire original array is exposed as `structuredWeights` and preserved in `raw.fonts[].weights`.

`search_brands.results[].brandName` and `search_brands.results[].iconUrl` also become optional strings. The official search response schema documents `name` and `icon` as nullable at `paths["/v2/search/{name}?c={clientId}"].get.responses["200"].content["application/json"].schema.items.properties`. Null values remain present in the original `raw` search results.

## Boundaries

Batch lookup and prefetch are documented but restricted to paid plans or prepaid credits, so this integration does not expose them. Enterprise GraphQL/webhooks and credential purchasing are also outside this integration's tools. There are no webhook registrations or triggers.

## Official references

- [Brand API](https://docs.brandfetch.com/reference/brand-api)
- [Brand Context API](https://docs.brandfetch.com/reference/brand-context-api)
- [Transaction API](https://docs.brandfetch.com/reference/transaction-api)
- [Brand Search API](https://docs.brandfetch.com/reference/brand-search-api)
- [Viewer API](https://docs.brandfetch.com/reference/viewer-api)
- [Logo parameters](https://docs.brandfetch.com/logo-api/parameters)
- [Logo usage guidelines](https://docs.brandfetch.com/logo-api/overview#usage-guidelines)
- [Brand API batch](https://docs.brandfetch.com/reference/brand-api-batch)
- [Official OpenAPI specification](https://docs.brandfetch.com/openapi.json)
