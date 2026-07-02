Now let me look at the actual API reference to understand the full feature set:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Owl Protocol

## Overview

Owl Protocol is a Web3 developer platform that simplifies deploying and managing smart contracts and digital assets (ERC20, ERC721, ERC1155) across EVM-compatible blockchains. It serves as a bridge between Web2 and Web3, allowing developers to deploy and manage smart contracts utilizing REST API endpoints without the need for private keys or crypto. Each API key comes with a secure MPC (Multi-Party Compute) key pair, and all API endpoints automatically handle the gas fees.

## Authentication

Owl Protocol uses **API key** authentication. Owl Protocol uses API keys for authentication.

- **Obtaining an API key**: Using the API requires having a Project API key. You need to log into the dashboard, create a project if you haven't done so yet, and copy your project API key.
- **Passing the API key**: The API key is passed in requests via the `x-api-key` HTTP header. For example: `x-api-key: <your_api_key>`.
- **JWT authentication**: The API also supports checking authentication with JWT or API key, though API key is the primary method for programmatic access.
- **TypeScript SDK**: When using the TypeScript SDK, the API key is passed during client initialization: `createClient({ apiKey: "API_KEY" })`.
- **Base URL**: The REST API is hosted at `https://contracts-api.owlprotocol.xyz/api/`.

## Features

### Collection (Smart Contract) Deployment and Management

Deploy and manage contracts utilizing API endpoints with the ability to update parameters and configuration as needed. Collections represent smart contracts for digital assets (NFTs or fungible tokens) deployed on any supported EVM chain.

- Requires specifying a `chainId` for the target blockchain network, along with collection `name` and `symbol`.
- Supports configuring ERC2981 royalty receiver and royalty amount in basis points (defaults to 5%).
- Supports custom base URIs for token metadata or defaults to the Owl Protocol hosted endpoint.
- Supports setting a contract image.

### Token Minting and Management

Mint, burn, and transfer tokens with dedicated endpoints. Supports both individual and batch minting of ERC721 tokens.

- Tokens can be associated with metadata templates.
- Token metadata (images, attributes) can be updated after minting.

### Token Templates

Create and manage reusable token templates that define default metadata (images, attributes) for tokens within a collection.

- Templates can be created, retrieved, listed, and updated.
- Useful for defining consistent metadata across multiple tokens.

### User Management

Create and manage project users who each receive a universal wallet for interacting with your project's digital assets.

- Every user on your platform can have a User Wallet created with just a social login.
- Each user has a single universal User Wallet that can store digital assets from any blockchain.
- Users can be created, retrieved, and listed within a project scope.

### Wallet Management

Owl Protocol API manages various types of wallets without the need for private keys or crypto.

- **Developer Wallets**: Controlled by your API Secret, developer wallets are useful for server-side management. Implemented as MPC wallets.
- **User Wallets**: Controlled via social login, meant for end-user onboarding.
- **Smart Wallets**: Both Developer Wallets and User Wallets are integrated with smart wallets. Owl Protocol smart wallets are ERC4337 compatible.
- Smart wallets offer gas-free sponsored transactions via a paymaster, single and batched transaction execution, multiple owners on a single wallet, and scoped session keys.

### Contract Metadata Management

Manage on-chain and off-chain metadata associated with deployed contracts. Retrieve, update, and list metadata for contracts within a project.

### Token Bridges (VeraBridge)

Deploy and manage token bridges for transferring digital assets between different EVM chains.

### Custom EVM Chains

Add custom EVM chain configurations and even launch custom chains or EVM rollups for your project.

### Web2 Integration (Zapier)

With built-in Zapier integration, you can create numerous workflows and trigger on-chain events with the 6000+ apps marketplace. Connect to e-commerce platforms, Point of Sale systems, CRM software, spreadsheets, and more. Pre-built templates exist for Google Forms, Google Sheets, GitHub, Eventbrite, and Shopify.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its API. On-chain event monitoring and workflow triggers are handled indirectly through the Zapier integration rather than through a native webhook system.
