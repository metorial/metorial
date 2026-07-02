Now I have enough information to write the specification.

# Slates Specification for Alchemy

## Overview

Alchemy is a blockchain development platform that provides APIs and infrastructure for interacting with multiple blockchain networks including Ethereum, Polygon, Solana, Bitcoin, and 80+ other chains. It offers node access via JSON-RPC, indexed blockchain data APIs (tokens, NFTs, transfers, prices), smart wallet infrastructure with account abstraction, and real-time webhook notifications for on-chain events.

## Authentication

Alchemy supports three methods of authentication:

**1. API Key in URL (Path Parameter)**

The simplest method. After creating an app in the Alchemy Dashboard, you receive an API key that is appended directly to the request URL:

```
https://eth-mainnet.g.alchemy.com/v2/{apiKey}
```

**2. API Key or Access Key in Authorization Header**

You can send your API key in the `Authorization` header instead of the URL, which keeps it out of request URLs that may appear in logs or browser history. Use a Bearer token format:

```
Authorization: Bearer YOUR_API_KEY
```

Access keys are a separate type of authentication token that can also be used in the Authorization header. They enable access to JSON-RPC APIs, NFT API, and Gas Manager Admin API. Unlike API keys, access keys are specifically designed for header-based usage.

Access keys are created from the Security section of the Alchemy Dashboard. When creating one, you name it, assign permissions (JSON-RPC & NFT API tied to a specific app, and/or Gas Manager read or read/write access).

**3. JWT Tokens**

JSON Web Tokens (JWTs) provide a more secure and flexible method, with the ability to generate unlimited keys and set custom expiration periods, though they require running your own backend server. JWTs are passed as Bearer tokens in the Authorization header, similar to API keys.

**Getting Credentials:**

All keys are created and managed through the [Alchemy Dashboard](https://dashboard.alchemy.com). You create an "app" for your desired blockchain network, and the dashboard provides the API key and endpoint URLs. Each app is scoped to specific blockchain networks that you enable.

## Features

### Node API (JSON-RPC Access)

Provides low-level access to standard JSON-RPC methods for interacting with blockchains, including sending transactions, querying blocks and logs, and accessing state. These APIs enable interaction through standardized JSON-RPC methods across all supported networks.

- Supports read operations (balances, contract state, block data) and write operations (submitting transactions).
- Includes gas estimation, WebSocket subscriptions for real-time events, and network information queries.
- Each blockchain network has its own endpoint URL.

### Token API

Allows requesting information about specific tokens like metadata and wallet balances. Retrieve ERC-20 token balances, metadata, and allowances for any address.

### Transfers API

Allows fetching historical transactions for any address without having to scan the entire chain and index everything. Supports filtering by transfer type (external, internal, ERC-20, ERC-721, ERC-1155).

- Can query by sender address, receiver address, or both.
- Supports block range filtering.

### Prices API

Provides access to real-time and historical prices for tokens.

### NFT API

Allows quickly getting all the information you need about NFTs from the blockchain. Fetches specific NFT information for both ERC-721 and ERC-1155 tokens in a single request, including:

- NFT ownership lookups (NFTs owned by an address, owners of a specific NFT).
- NFT metadata retrieval (attributes, images, collection info).
- NFT spam detection and classification.
- NFT sales and transfer history.
- Contract-level collection data.

### Portfolio API

Includes everything you need to build a view of a user's assets: fungibles, NFTs, and their transactions. Supports querying across multiple wallet addresses and multiple networks simultaneously.

### Transaction Simulation

Allows simulating a transaction and seeing its potential effects before sending it. Useful for previewing gas costs, state changes, and potential failures.

### Smart Wallets (Account Abstraction)

Provides everything needed to build zero-friction user flows using smart contract accounts, including handling user operations, sponsoring gas, and implementing smart accounts with account abstraction.

- Gas sponsorship via Gas Manager policies.
- Support for social login, email, SMS, and custom authentication for wallet creation.
- Server-side wallet management via access keys.

## Events

Alchemy Webhooks provide real-time notifications for primarily on-chain data. They're often used to stream on-chain activity for a set of wallets, events and traces on smart contracts, and all block data for a particular chain. Webhooks can be created manually from the dashboard or programmatically via the Notify API. Webhook payloads are signed for verification.

### Address Activity

Tracks all ETH, ERC-20, ERC-721, and ERC-1155 transfer activity for a set of monitored addresses. Fires when a tracked address sends or receives tokens or native currency.

- Configure up to 100,000 addresses per webhook.
- Addresses can be added or removed programmatically via the Notify API.

### NFT Activity

Tracks ERC-721 and ERC-1155 token transfer activity. Fires when NFTs matching the configured filters are transferred between addresses.

- Can monitor specific NFT contracts or collections.

### Custom Webhooks

Allows filtering on transactions, debug traces, or event logs using GraphQL, providing immediate notification about important activity. This is the most flexible webhook type.

- Track any smart contract interaction, marketplace activity, or contract creation.
- Define custom GraphQL filters to receive only the data you need.
- Supports filtering on any on-chain interaction across supported chains.
