Now let me look at the actual API reference to understand the specific endpoints/features:# Slates Specification for Skyfire

## Overview

Skyfire is a payment and identity network for AI agents, enabling autonomous transactions between buyer agents and seller services. It enables programmatic interaction between buyers and sellers through a token-based payment and identity protocol. Buyers can interact with seller's MCP servers, APIs and services by leveraging Skyfire's identity (KYA) and payment (PAY) tokens.

## Authentication

Skyfire uses **API key authentication**. Agent accounts are accessed programmatically using unique API keys. Each agent may have one or more API keys for secure access.

- API keys are created in the Skyfire Dashboard and are scoped per agent (Buyer or Seller).
- Pass API keys in all requests via the HTTP header: `skyfire-api-key`.
- Keys are scoped per agent (Buyer or Seller).

The base API URL is `https://api.skyfire.xyz`. The JWKS endpoint for token verification is available at `https://app.skyfire.xyz/.well-known/jwks.json`.

To get started:

1. Create an account at `app.skyfire.xyz` using your email address (passwordless login via email link).
2. Upon signup, your Buyer Agent account is created automatically, along with a pre-funded wallet.
3. Generate an API key from the Dashboard.
4. Optionally create a Seller Agent account via the Dashboard for selling services.

## Features

### Token Creation and Management (Buyer)

Buyers create JWT-based tokens to authorize payments and/or share identity with sellers. PAY tokens authorize payment only. KYA (Know Your Agent) tokens verify the agent's identity without payment. KYA+PAY tokens combine both, allowing sellers to verify the agent's identity and charge for the service in a single flow.

- The agent calls the Create PAY Token endpoint with the seller service ID, maximum charge amount as a decimal string, and expiration timestamp.
- Skyfire returns a JWT token the agent passes to the seller when calling their API.
- Tokens can be introspected to check validity before use.
- Setting appropriate expiration windows (5-10 minutes for one-time use) minimizes waste.

### Token Charging (Seller)

Sellers validate and charge buyer tokens to collect payment for services rendered. Your seller service must be able to accept and validate the Skyfire token (JWKS), and if payment is required, use your seller API key to call the Skyfire Charge Token API to complete the transaction.

- Sellers authenticate buyers via KYA tokens and charge via PAY or KYA+PAY tokens.
- Each payment token includes a maximum charge amount set by the agent. Sellers can charge up to that authorized amount.

### Wallet Management

Each agent account comes with an associated wallet, managed by Skyfire.

- Buyers fund their wallets to purchase services and tools. Sellers receive funds in their wallets after successfully charging buyer tokens and delivering the service.
- Buyers can check wallet balance before initiating transactions.
- Fund agents using traditional payment rails like debit cards, credit cards, ACH, international wires or USDC.
- Withdraw earnings in digital dollars to an external wallet address or exchange account. Enterprise users can also transfer directly to their bank accounts.

### Service Directory

Skyfire maintains a marketplace of services that accept agentic payments. Your agent browses this directory by searching with keywords, filtering by category or tags like 'ai' or 'data', and comparing prices.

- Browse and search available seller services.
- Filter services by tags to find exactly what you need.
- Retrieve seller service IDs needed to create payment tokens.

### Seller Service Registration

The seller agent enables users to offer services, tools, or APIs for consumption by buyers. Must be explicitly created via the Skyfire Dashboard. Can register Seller Services for discovery and token-based access. Can define identity and payment requirements for incoming buyer requests.

- A seller can define multiple seller services under one seller agent.
- Services can be free (KYA only) or paid (PAY or KYA+PAY).
- Submit for approval — most services are reviewed within 24 hours.
- Sellers can specify identity verification requirements (individual or business) that buyers must satisfy.

### Transaction Auditing

The agent can list all buyer tokens with optional date and status filters, then retrieve charge details for any specific token. This shows exactly what was authorized versus what was actually charged, enabling automated reconciliation at any scale.

- Audit charges for a specific token.
- Track service usage and inbound payments.

## Events

The provider does not support webhooks or event subscriptions based on available documentation.
