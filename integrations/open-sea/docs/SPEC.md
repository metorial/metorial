# Slates Specification for OpenSea

## Overview

OpenSea is the largest NFT marketplace, supporting buying, selling, and trading of NFTs (ERC721 and ERC1155 tokens) across multiple blockchains. OpenSea currently supports Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Zora, Base, Blast, Sei, B3, Berachain, Flow, ApeChain, Soneium, Shape, Unichain, Ronin, Abstract, Solana, GUNZ, HyperEVM, Somnia, and Monad blockchains. The API helps developers build experiences using NFTs and marketplace data, including events, collections, listings, offers, and more.

## Authentication

OpenSea uses **API Key** authentication.

- The API key allows access to the Stream API and all V2 endpoints.
- Each account can generate up to three API keys. On opensea.io, hover over the left-hand sidebar and click Settings then Developer to generate a key.
- The API key is passed as a request header: `X-API-KEY: <your_api_key>`.
- There is no OAuth flow or user-level authorization; all access is scoped to the API key holder.

## Features

### NFT Data Retrieval

Fetch metadata for any NFT on any OpenSea-supported blockchain. NFTs can be fetched by collection, smart contract, or owner address. This includes traits, ownership information, and media URLs. You can also validate and refresh NFT metadata to ensure it reflects the latest on-chain state.

### Collection Management

Retrieve detailed information about NFT collections, including descriptions, fees, social links, and traits. Fetch floor price, volume, and other statistics for any collection.

### Marketplace Operations — Listings

Programmatically create listings and offers on NFTs. Offers are supported on individual NFTs, as well as on a collection or on a particular trait. You can retrieve best listings and all listings for a collection or individual NFT, and generate fulfillment data to complete purchases on-chain. Orders can be cancelled off-chain when protected by the SignedZone.

### Marketplace Operations — Offers

Create item-level offers or criteria-based offers (collection offers and trait offers). Retrieve the best offer or all offers for a specific NFT, collection, or trait. Fulfill offers by generating the required on-chain transaction data.

### Account & Ownership Lookup

Retrieve OpenSea account profiles and query NFTs owned by a specific wallet address across supported chains.

### Analytics & Events History

Query historical marketplace events such as sales, listings, offers, transfers, and cancellations. Events can be filtered by collection, specific NFT, account, event type, and time range.

### Token Data (Fungible)

Retrieve trending and top fungible tokens, get token details and balances by account, and obtain swap quotes.

### Search

Search across OpenSea for collections, NFTs, and accounts via a unified search interface.

## Events

The OpenSea Stream API is a websocket-based service that enables developers to receive events as they occur. With the Stream API, your service can subscribe to receive a range of different types of events, either globally or for specific collections.

Authentication with the Stream API uses the same API key as the other APIs.

Each subscription function includes a `collectionSlug` parameter which can be used to subscribe to an event from a specific collection. To subscribe to events across all collections, use the `*` wildcard for the `collectionSlug` parameter.

### Item Listed

An item listed for sale on the OpenSea marketplace.

### Item Sold

A sale of an item on the OpenSea marketplace.

### Item Transferred

Transfer of an item between wallets.

### Item Metadata Updated

Update detected on the metadata provided in `tokenURI` for an item.

### Item Cancelled

Cancellation of an order on the OpenSea marketplace.

### Item Received Bid

Bid received on an item in the OpenSea marketplace.
