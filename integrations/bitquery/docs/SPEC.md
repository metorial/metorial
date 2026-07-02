# Slates Specification for Bitquery

## Overview

Bitquery is a software as a service that allows users to create, manage, and execute queries to retrieve blockchain data from various networks in a unified way. It provides APIs to query real-time and historical transactions, balances, transfers, NFTs, tokens, DEX trades, smart contract calls, events, and more, supporting 40+ blockchains including Bitcoin, Ethereum, Solana, and Polygon.

## Authentication

Bitquery offers two API versions with different authentication methods:

### API V1 — API Key

In V1, you use an API key to authenticate your requests to `graphql.bitquery.io`. The API key is passed in the HTTP `X-API-KEY` header. Accounts are created using email/password. After registration, a unique secret API key is generated, associated with the account, and used to authenticate and authorize requests to the GraphQL server.

- **Endpoint:** `https://graphql.bitquery.io`
- **Header:** `X-API-KEY: <your_api_key>`

### API V2 (Streaming API) — OAuth 2.0 Bearer Token

In V2, you use an OAuth token (formatted as `Bearer ory_...yourtoken`) to authenticate your requests to `streaming.bitquery.io/graphql`.

There are two ways to obtain a token:

1. **Manual generation:** Go to the Access Token page, select the application for which you want to generate an access token, click "Generate Access Token," and copy it.

2. **Programmatic generation (Client Credentials):** Use your client ID and secret from your application to make a POST request to `https://oauth2.bitquery.io/oauth2/token` to get a token programmatically. The request must use `grant_type=client_credentials` and `scope=api`.

- **Token endpoint:** `https://oauth2.bitquery.io/oauth2/token`
- **API endpoint:** `https://streaming.bitquery.io/graphql`
- **WebSocket endpoint:** `wss://streaming.bitquery.io/graphql`
- **Header:** `Authorization: Bearer <access_token>`

If you have no applications created, the Bearer token changes every 12 hours.

## Features

### Multi-Chain Blockchain Data Querying

Query blockchain data using GraphQL across a wide range of data types including transactions, blocks, addresses, and more. A unified interface queries more than 30 blockchains using a unified schema, making it easier to build solutions that support multiple blockchains.

- Supports EVM chains (Ethereum, BSC, Polygon, Arbitrum, etc.), Solana, Bitcoin, Tron, and others.
- Data is organized into "cubes" — multi-dimensional data tables optimized for specific query types (e.g., DEXTrades cube, Transfers cube), each with predefined dimensions, metrics, and filters.

### DEX Trades & Token Pricing

Query trading data from different DEXs such as Uniswap, PancakeSwap, and 0x. The API provides historical and real-time trades and pricing information for tokens, with filters across DEXs, protocols, tokens, trades, and pools.

- OHLCV candle data for charting.
- Buy/sell volume, maker information, and liquidity pool data.
- Data includes real-time trades, token prices, buys, sells, sell volume, makers, top holders, and liquidity of a pair.

### Token Transfers & Balances

Get real-time and historical token and native balances for any address. Track balance changes over time, calculate portfolio values in USD, and monitor wallet holdings across ERC-20, ERC-721, and ERC-1155 tokens.

- Query transfer history by token, sender, receiver, or time range.

### Token Holder Analytics

Track and analyze token holder distributions with historical and real-time data. Get top holders by balance, monitor holder count changes, calculate distribution metrics like Gini coefficient and Nakamoto coefficient, identify new and active holders, and track activity dates for any ERC-20 token.

### NFT Data

Access comprehensive NFT data including collections, ownership tracking, transfer history, marketplace trades, and metadata. Query NFT collections by contract address, track ownership changes, monitor transfers and sales across marketplaces, and retrieve token metadata including attributes and rarity information.

### Smart Contract Events & Calls

Bitquery parses smart contract calls, events, and arguments using ABI and method signatures, offering structured data.

- Query decoded event logs and method calls with execution traces.

### Coinpath® — Money Flow Analysis

Coinpath® is a specialized set of APIs for blockchain money flow analysis. It traces cryptocurrency movements across addresses and chains, useful for investigating hacks, crypto compliance (e.g., anti-money laundering), and forensic analytics. Users can monitor transactions and uncover links between wallets.

### Mempool Data

Access pending (unconfirmed) transaction data from blockchain mempools for supported networks (e.g., Ethereum, Tron). Useful for simulating pending transactions and monitoring fee data.

- Not available for all chains.

### Liquidity Pool Monitoring

Monitor real-time liquidity changes, track pool reserves, and analyze liquidity depth for token pairs on DEX pools. Track when liquidity is added or removed, monitor pool health, and analyze liquidity patterns across different pools.

## Events

Bitquery supports real-time data streaming through **GraphQL Subscriptions** delivered over WebSocket connections and **Kafka Streams**.

### WebSocket Subscriptions

Unlike regular queries that fetch data once, GraphQL subscriptions establish a persistent connection that pushes new data automatically when it becomes available. You can convert most GraphQL APIs into GraphQL streams by changing the word `query` to `subscription`.

- **Endpoint:** `wss://streaming.bitquery.io/graphql`
- You can bundle various subscriptions, such as DEX Trades, Transactions, Blocks, and Transfers, into a single WebSocket stream.
- All GraphQL filtering capabilities are available to narrow down the data you receive (e.g., filter by chain, token, protocol, address, amount thresholds).
- Supported event data categories include: DEX trades, token transfers, block data, transactions, smart contract events, NFT activity, and mempool transactions.

### Kafka Streams

Bitquery provides real-time blockchain data through Kafka streams as an alternative to WebSocket subscriptions.

- Lower latency than WebSocket (sub-500ms for some chains).
- Filtering is available but more limited compared to WebSocket's extensive filtering options.
- Kafka endpoints are available at `rpk0.bitquery.io:9092`, `rpk1.bitquery.io:9092`, `rpk2.bitquery.io:9092`.
