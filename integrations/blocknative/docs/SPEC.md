Now let me check on the mempool streaming/webhook capabilities and the mempool archive:# Slates Specification for Blocknative

## Overview

Blocknative provides blockchain infrastructure focused on gas fee estimation, mempool monitoring, L2 batch decoding, and blob data archival. It offers gas fee estimation for over 40 chains including Ethereum, Bitcoin, Optimism, Arbitrum, Base, Polygon, and Sei. It also provides APIs to decode Ethereum L2 batch transactions into human-readable format and stores all blobs that enter the Ethereum mempool for archival purposes.

## Authentication

Blocknative uses API key-based authentication. A valid Blocknative API key is passed in the `Authorization` header of every request.

- **API Key**: Obtained by registering at [blocknative.com/request-api-key](https://www.blocknative.com/request-api-key).
- **Header format**: `Authorization: <YOUR_API_KEY>`
- For some endpoints (like the Gas Price API and Chains API), the API key is optional but a free API key is recommended for more generous rate limits and future features.
- For other endpoints (like the Gas Distribution API), a valid API key is required.
- There are free and paid tiers, which affect update frequency and access.
- For the WebSocket-based Mempool SDK, the API key is passed as the `dappId` (or `apiKey`) parameter when initializing the SDK connection.

No OAuth or additional scopes are involved. Authentication is solely based on the API key.

## Features

### Gas Price Estimation

Provides the gas price needed to have a certain probability of inclusion in the next block (for Ethereum or Bitcoin) or the next ~10 seconds, depending on the chain. You can override default confidence levels (99, 95, 90, 80, 70) with up to 5 custom confidence levels. Supports both pre-EIP-1559 (Type 0) and EIP-1559 (Type 2) transaction pricing.

- **Parameters**: Chain ID, confidence levels, system/network identifiers.
- The Gas Distribution API currently only supports Ethereum mainnet.

### Base Fee and Blob Fee Prediction

Provides real-time predictions for both the base fee and the blob base fee on the Ethereum network, assisting users in setting optimal gas fees for transactions. Predictions are made for the next 5 blocks at 99% and 50% confidence levels.

- Only available for Ethereum.

### Gas Distribution

Provides the distribution and breakdown of gas prices in the mempool at that moment in time. Useful for understanding current mempool pressure and transaction pricing dynamics.

- Only available for Ethereum mainnet.

### Supported Chains Discovery

Provides metadata on supported chains, including their chain ID, label, architecture, and available features, allowing developers to dynamically identify which networks are integrated with Blocknative services.

### Gas Oracles Discovery

Provides metadata on supported chains with on-chain gas estimation oracles, including chain ID, label, architecture, RPC URL, block explorer URL, and oracle contract addresses keyed by version.

### L2 Batch Decoding

Accepts a transaction hash of a batch and returns decoded data. You can query any batch — pending or confirmed. Supports decoding of calldata (type-2) and blobdata (type-3).

- Currently available for transactions on Optimism, Base, zkSync, Arbitrum, Mode, Zora, Kroma, and Blast.
- Useful for L2 developers who need to inspect individual transactions within rolled-up batches without manually decoding compressed byte streams.

### Blob Archive

Stores all blobs that enter the Ethereum mempool (confirmed on-chain or not). Given any versionedHash of an on-chain blob, the archive returns the versioned hash, commitment, proof, count of zero-bytes, count of non-zero bytes, and blob data. You can also request a summary view without the full blob data.

- Useful for accessing historical blob data beyond the ~18-day ephemeral storage window on Ethereum.

### Mempool Monitoring

Blocknative allows developers to monitor mempool transactions using webhooks and websockets. You can subscribe to transaction events for specific addresses or transaction hashes and receive real-time updates on transaction lifecycle states (pending, confirmed, etc.).

- A transaction hash or account address can be subscribed to for all events.
- Filters can be applied to narrow down events (e.g., only confirmed transactions, specific contract interactions).
- Supports custom ABI uploads for decoding smart contract interactions in monitored transactions.

## Events

Blocknative supports real-time event streaming via **WebSockets** and **webhooks** for mempool transaction monitoring.

### Transaction Lifecycle Events

A WebSocket connection provides real-time transaction updates for subscribed addresses or transaction hashes. Events cover the full transaction lifecycle including states such as `txPool` (transaction enters mempool), `txConfirmed` (transaction confirmed on-chain), speed-ups, cancellations, and failures.

- **Parameters**: Address or transaction hash to subscribe to, chain/network ID, optional filters (e.g., by transaction status, value thresholds, contract method calls).
- Supports both webhooks and websockets for data delivery.
- A Multichain SDK is available for subscribing to events across multiple chains simultaneously. Currently a transaction hash or account address can be subscribed to for all events.

### Webhook Delivery

The Mempool API provides transaction monitoring using webhooks. Whenever a matching Ethereum transaction is available, it sends a POST request to the configured webhook URL. Webhook configurations can be managed via the Mempool Explorer interface and tied to specific API keys and filter configurations.
