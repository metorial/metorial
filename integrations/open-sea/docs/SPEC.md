# OpenSea Integration

Retrieve NFT metadata, collections, wallet holdings, public account profiles, marketplace events, listings, and offers. Request asynchronous NFT metadata refreshes.

## Authentication

Supply an OpenSea API key from Settings > Developer. Public REST requests send the key in the `X-API-KEY` header. The key supplies application access and quota, rather than an authenticated wallet identity. This integration does not request wallet JWTs or sign or broadcast blockchain transactions.

## Available tools

| Tool | Capability |
| --- | --- |
| `get_nft` | Retrieve one NFT by chain, contract address, and token identifier, including traits and owners. |
| `list_nfts` | Browse a collection, contract, or wallet with cursor pagination. |
| `get_collection` | Retrieve collection details, optionally including collection statistics or legacy trait counts. |
| `list_collections` | Browse collections with optional chain and sort filters; OpenSea currently documents a maximum of 100 per page. |
| `get_events` | Retrieve collection, NFT, or account events with type, time, and cursor filters. Existing legacy event filter values remain available. |
| `get_listings` | Retrieve all or best collection listings, or one NFT's best listing. |
| `get_offers` | Retrieve collection or trait offers, or one NFT's best offer. |
| `get_account` | Look up a public profile by wallet address or username. |
| `refresh_nft_metadata` | Request an asynchronous metadata refresh. |

For NFT operations, an explicit chain takes precedence over the optional default chain in connection configuration; otherwise Ethereum is used. NFT media fields are provider metadata URLs rather than file download operations.

## Compatibility and limits

The optional `get_collection.includeTraits` behavior retains its existing `/api/v2/collection/{slug}/traits` route. OpenSea now documents `/api/v2/traits/{slug}`, where `categories` describes trait types and `counts` supplies value counts. The legacy route has not been verified against a live account. If the response includes `counts`, the existing numeric trait-count output uses that field.

Legacy event filter values `cancel`, `order`, and `redemption` remain available for compatibility. The current REST reference lists `sale`, `transfer`, `mint`, `listing`, `offer`, `trait_offer`, and `collection_offer`; order invalidation and revalidation use the Stream API. This integration does not subscribe to streams.

No order creation, fulfillment, cancellation, token swaps, or unified search tools are exposed. API availability, key quota, and provider rate limits apply.

## Official documentation

- [Authentication](https://docs.opensea.io/reference/auth)
- [API reference](https://docs.opensea.io/reference/api-overview)
- [OpenAPI schema](https://api.opensea.io/api/v2/openapi.json)
- [Collection traits](https://docs.opensea.io/reference/get_collection_traits)
- [Marketplace events](https://docs.opensea.io/reference/list_events_by_collection)
