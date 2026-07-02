# Slates Specification for Kaleido

## Overview

Kaleido is an enterprise blockchain-as-a-service (BaaS) platform that enables organizations to create, manage, and operate permissioned and public blockchain networks. It allows users to create and manage private, enterprise blockchain networks, supporting the entire blockchain journey from proof-of-concept to live production. Environments are configurable with different node clients (Geth, Quorum, Hyperledger Besu, Corda, and Hyperledger Fabric) and multiple consensus algorithms (Raft, PoA, and IBFT).

## Authentication

Kaleido uses two distinct authentication mechanisms depending on the API layer being accessed:

### 1. Administrative API Keys (Platform/Admin APIs)

Used for managing platform-level resources such as consortia, environments, nodes, and services.

- Use the Kaleido console to generate a new API Key: log in, click the user icon in the lower left corner, and click "Profile Settings." Use the "API Keys" tab to generate new keys.
- When making an API call, supply the API Key as a Bearer token in the Authorization header: `Authorization: Bearer <YOUR_API_KEY>`.
- API Keys are organization-specific administrative tokens. They are one-time-viewable strings and are not stored by the Kaleido backend.
- Base URL varies by region:
  - US: `https://console.kaleido.io/api/v1`
  - EU: `https://console-eu.kaleido.io/api/v1`
  - Sydney: `https://console-ap.kaleido.io/api/v1`
  - Seoul: `https://console-ko.kaleido.io/api/v1`

### 2. Application Credentials (Runtime APIs)

Used for connecting to blockchain nodes and services within an environment.

- The runtime APIs exposed by all blockchain nodes and services are secured with strongly generated credentials called Application Credentials. They are bound to a membership within the consortium and exist solely within the environment where they were created.
- Application credentials are supplied base64 encoded using HTTP Basic Auth, which has wide support in client libraries and web browsers.
- With the Blockchain Application Firewall enabled, the same credentials can also be supplied as a Bearer token, custom header (`X-Api-Key`), query parameter, or cookie.
- The app credential password is shown only once after creation. Kaleido does not store these plaintext tokens.

### 3. JWT / OAuth 2.0 / OpenID Connect (Runtime APIs, optional)

- JWT token verification via OAuth 2.0 with OpenID Connect is supported. Kaleido acts as the OAuth Resource Server.
- Kaleido is configured with public keys to verify JWT tokens issued by an external IAM server.
- Public keys can be added via JWKS, RSA, or ECDSA configurations.

## Features

### Consortium & Environment Management

Everything available via the Kaleido console is also available via the API, including creating and managing consortia, environments, blockchain nodes, and full-stack services. Consortia group memberships representing organizations, while environments are isolated blockchain runtimes with their own ledger and resources.

- Supports multiple blockchain protocols: Ethereum (Geth), Quorum, Hyperledger Besu, Corda, and Hyperledger Fabric.
- Multiple consensus algorithms: Raft, PoA, IBFT.
- Multi-region and multi-cloud deployment (AWS, Azure).

### Blockchain Node Management

Provision and manage blockchain nodes within environments. Nodes can be transitioned between signing and non-signing roles in the consensus algorithm. Nodes can be started, stopped, and suspended, with billing paused during suspension.

- Create Ethereum accounts on nodes.
- Access node logs.
- Configure node size (affects resource allocation).

### Smart Contract Management

Upload Solidity files and Kaleido generates REST APIs that can interact with any on-chain contract with the same ABI. When the API Gateway is used to deploy a contract instance, a new API scoped to that instance is generated.

- Compile Solidity contracts via the platform.
- Deploy contract instances with friendly names instead of hex addresses.
- The chain indexer analyzes every smart contract deployment and automatically makes APIs available when there's a match to a known compiled contract.
- Contract projects can be sourced from GitHub or precompiled ABI/bytecode.

### REST API Gateway

The platform automatically generates modern REST APIs with OpenAPI (Swagger) documentation directly from Solidity source code, including methods, events, and types. Handles transaction submission, nonce management, key management, signing, and RLP encoding transparently.

- Supports both synchronous and asynchronous transaction submission.
- Backed by Apache Kafka for reliable transaction ordering.

### Token Factory

The Token Factory service makes it simple to generate and deploy token smart contracts for ERC20 (fungible tokens) and ERC721 (non-fungible tokens). Token contracts manage total supply, ownership, transfers, delegate spenders, minting, and burning.

### Wallet & Key Management

Ethereum Wallets allow DApps to host transaction signing keys. Using the API, a DApp can add new Ethereum accounts, query available accounts, and pick an account to sign a transaction payload.

- Hierarchical Deterministic (HD) Wallets sign transactions using many keys derived from the same root key.
- Cloud HSM signing allows signing with off-platform keys stored in a Hardware Security Module-backed cloud service or software key vault.

### Document Exchange

Securely upload and transfer files within a Kaleido environment. Transactions reference a file's hash rather than dealing with file contents directly.

- Files can be stored in Kaleido-hosted storage or external services such as AWS S3 Buckets or Azure Blob containers.
- All transferred data is deterministically hashed, signed, compressed, and asymmetrically encrypted in flight.
- Documents can be shared with specific participants via encrypted App2App messaging.

### Off-Chain Messaging

Communicate securely and reliably off-chain with end-to-end encrypted messaging between applications, with reliable delivery backed by Apache Kafka.

### Public Ethereum Tether

The Public Ethereum Tether service enhances the security of a permissioned blockchain by pinning signed state hashes to an Ethereum public chain. Configurable intervals and target Ethereum networks.

### Zero Knowledge Token Transfers

With the Zero Knowledge Token Transfer service, transfers are conducted with Zero Knowledge Proofs such that transactions are both confidential (balances and amounts are concealed) and anonymous (sender and receiver identities are concealed).

### Audit Logging

The platform provides a history of resource-specific CRUD operations associated with a user's organization and/or a specific consortium (e.g., invitation issued, membership created, node deleted, etc.).

### Blockchain Application Firewall

A configurable security layer in front of nodes that supports fine-grained access control via claim mappings and rulesets. Supports both Application Credential and JWT authentication, with rules evaluated against every JSON/RPC call.

## Events

Kaleido supports event streams for delivering smart contract events emitted on-chain to off-chain applications.

### Smart Contract Event Streams

Event streams consume event payloads emitted from deployed smart contracts. Smart contracts must have an event interface specifying contract parameters for indexing. Indexed arguments are stored on-chain in the transaction's log and delivered to subscribed clients.

Two delivery mechanisms are supported:

- **Webhooks**: Events are delivered to an API endpoint of your choosing via an HTTP/HTTPS connection configured with your own headers and security. Configurable batch size, timeout, retry parameters, and custom headers (including API key authentication).
- **WebSockets**: Events are sent over WebSocket connections, useful if the application does not have a publicly accessible HTTP server or wants to receive many events over a single long-lived connection. Clients subscribe to specific topics.

Key configuration options:

- Configure which block to start receiving events from (including historical events from block 0).
- Optionally filter events to a specific contract instance; otherwise all events matching the signature are delivered.
- A single event stream instance can encapsulate multiple subscriptions.
- Streams can be suspended, resumed, and deleted.
