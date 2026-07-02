Now let me look at the V2 API docs in more detail to understand features and the notification/webhook system better.Now I have enough information to write the specification.

# Slates Specification for beaconcha.in

## Overview

Beaconcha.in is an open-source Ethereum blockchain explorer maintained by Bitfly that provides unified data across the consensus and execution layers. It is built for the Ethereum consensus layer and provides comprehensive querying tools to understand its inner workings. It offers APIs for querying validator performance, staking rewards, network state, and managing validator dashboards, as well as notifications via webhook for validator events.

## Authentication

API keys can be obtained in the user portal and must be included in requests either as a query string parameter or in the request header.

V1 and V2 APIs use the same authentication method. A single API key is valid for all endpoints.

**Bearer Token (Header):**
Include the API key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <YOUR_API_KEY>
```

**Query Parameter:**
Alternatively, pass the API key as a query string parameter (e.g., `?apikey=<YOUR_API_KEY>`).

API endpoints require an API key; a free API key can be obtained from the user portal at `https://beaconcha.in/user/api-key-management`.

Free and paid users have access to both V1 and V2 APIs. Pro features are available for users on the Scale and Enterprise plans.

**V2 API note:** All V2 API endpoints use the `POST` method with a JSON request body. The `chain` field (`"mainnet"` or `"hoodi"`) is required in every request.

## Features

### Ethereum Network State

Query the current state of the Ethereum network, including the current epoch and total validator count. The `chain` parameter (`mainnet` or `hoodi`) is required for all V2 requests.

### Validator Metrics & Rewards

Access validator performance metrics and real-time staking rewards data. Retrieve detailed reward breakdowns per validator per epoch, including attestation rewards (head, source, target), sync committee rewards, block proposal rewards (execution layer and consensus layer), and penalties. Validators can be queried by index or public key. Attestation-based efficiency metrics are available, measuring correctness and inclusion delay of validator votes.

### Validator Duties

Query upcoming and historical validator duties including block proposals, attestations, and sync committee assignments.

### Entities & Benchmarking

Look up known staking entities (e.g., staking pools, operators) and compare their performance. Features include BeaconScore (performance scoring), an entities overview page, and entity-level dashboards for deep dives. BeaconScore and entity benchmarking are Pro-tier features.

### Validator Dashboard Management

Create validator dashboards and validator groups through the UI, then manage them via API by adding and assigning validators to groups. Supports Ethereum mainnet, Holesky testnet, and Gnosis network. Dashboards can be shared with others. Supports monitoring of up to 100,000 validators with custom validator groups.

### Execution Layer Data

Access execution layer data including real-time transaction tracking, wallet balances, token holdings, smart contract interaction analysis, and gas fee monitoring.

### Consensus Layer Data (V1 Legacy)

The V1 API provides access to consensus layer data such as blocks, epochs, slots, validators, attestations, deposits, and withdrawals. The V1 API remains available but no new features will be added.

### Node Monitoring

A free monitoring tool for solo stakers where the user specifies a monitoring endpoint on their beacon and validator nodes. Compatible with Lighthouse, Lodestar, Teku, and Nimbus consensus clients. Metrics are pushed to beaconcha.in and displayed in the mobile app.

## Events

Beaconcha.in supports notifications via email, push, or webhook.

### Validator Event Webhooks

Webhooks can be configured at `https://beaconcha.in/user/webhooks`. The number of available webhook endpoints depends on the subscription tier (ranging from 1 to 30). Webhook notifications can also be formatted for Discord.

Alerts can be set up for downtime, missed duties, rewards, and more. Specific notification types include:

- **Block Proposals:** Alerts when a validator is assigned or completes a block proposal.
- **Attestation Missed:** Alerts when a validator misses an attestation.
- **Sync Committee:** Alerts for sync committee assignments.
- **Slashing:** Alerts when a validator is slashed.
- **Validator Status Changes:** Alerts on lifecycle events such as activation, exit, and withdrawal processing.
- **Machine Monitoring Alerts:** Custom machine alerts for CPU, RAM, and other system metrics (available on paid plans).

Notification types are configured per validator or per validator group, and the same event types can be delivered across email, push, and webhook channels simultaneously.
