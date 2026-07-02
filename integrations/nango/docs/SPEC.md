Now let me get more details on the webhooks from external APIs and the environments/connect sessions:# Slates Specification for Nango

## Overview

Nango is an open-source platform for building product integrations. It supports 700+ APIs and works with any backend language, AI coding tool, and agent SDK. Nango handles auth, execution, scaling, and observability, providing managed OAuth, API proxying, data syncing, and serverless integration functions.

## Authentication

Nango uses a **Secret Key** for API authentication. Use the Nango Secret Key available in your Environment Settings as a Bearer token in the Authorization header: `Authorization: Bearer {nango-secret-key}`.

Key details:

- Secret keys are environment-specific (dev, prod, etc.). Keys can be rotated via the dashboard. All API requests require a valid secret key in the Authorization header.
- Get your secret key in the environment settings of the Nango UI. This key should never be shared.
- The base URL for Nango Cloud is `https://api.nango.dev`. Omitting the host points to Nango Cloud. For local development, use `http://localhost:3003`.

For the **Frontend SDK**, Nango uses short-lived **Connect Session Tokens** instead of direct API keys. A connect session is created from your backend (using the secret key) and lasts 30 minutes. The returned token can be used to create connections for a given end user. The session token is then passed to the frontend SDK to initiate auth flows.

## Features

### Managed Authentication (Auth)

Embed a white-label, managed auth flow in your app. Nango handles OAuth, API keys, token refresh, and credential storage for 700+ APIs. Never deal with auth plumbing again. Supports OAuth 1, OAuth 2, API Key, and Basic Auth. Connections represent per-user, per-integration authorization and can be managed (created, listed, retrieved, deleted) via the API.

### Proxy (Authenticated API Requests)

Make authenticated API requests on behalf of your users. Send requests through Nango's proxy gateway and it resolves the provider, injects credentials, handles retries and rate limits, and returns the response. No credential management in your codebase. You specify the target API endpoint, integration ID, and connection ID, and Nango handles the rest.

### Functions (Syncs and Actions)

Write integration logic as TypeScript functions and deploy them to Nango. Functions execute on a production runtime with built-in API access, retries, storage, and observability. The runtime handles per-tenant isolation, elastic scaling, and predictable execution.

There are two types of functions:

- **Syncs**: Scheduled functions that continuously pull data from external APIs into Nango's cache. They support configurable frequency, incremental syncing, and data model definitions. Synced records are stored and can be fetched by your application.
- **Actions**: On-demand functions that perform one-off operations against external APIs (e.g., creating a record, sending a message).

### Integration Management

Integrations can be created, updated, listed, and deleted via the API. Each integration ties a provider (e.g., Slack, GitHub) to a configuration including auth credentials (client ID/secret for OAuth, etc.). Connections under each integration represent individual user authorizations.

### Connect Sessions

The Connect session unlocks a pre-built authorization UI, which simplifies collecting API keys, basic credentials, and OAuth flows with custom parameters. This UI also validates end-user inputs and provides guidance on required credentials. Sessions can be scoped to specific allowed integrations and carry end-user metadata.

### External Webhook Processing

Webhooks let you listen to incoming webhooks from external APIs and react to them. You want to know about changes in the external API in real time, build a real-time data sync, and not deal with how each API implements webhooks, subscriptions, or attributing webhooks to users. Nango can either forward external webhooks to your app or trigger a Function to process them within Nango before forwarding.

### AI Integration Builder

Nango's AI builder generates and assists in implementing Functions using the IDE and model of your choice. It feeds the necessary context to the model so you can describe your use case and get production-ready code with minimal manual effort. Unlike black-box integrations, Nango generates human-readable code that you can review, edit, and maintain.

### Observability

Detailed real-time logs and metrics are available, with OpenTelemetry integration. Every function execution, API request, and webhook is logged and visible in the Nango dashboard.

### Environments

Each environment in your Nango account is completely isolated, with separate credentials, connections, integration configurations, and secret keys. This ensures production data is never accessible from development environments.

## Events

Nango supports webhooks to notify your application of events. Nango sends webhook notifications to your backend in three cases: sync webhooks (new data from syncs is available), authorization webhooks (an authorization flow completes), and external API webhook forwarding.

### Auth Events

New connection webhooks have `"type": "auth"` and `"operation": "creation"`. They are sent after a connection has been successfully created. Auth webhooks are also sent for token refresh failures (`"operation": "refresh"`). The payload includes the connection ID, provider, auth mode, environment, and end-user information.

### Sync Events

Sync webhooks are sent when a sync execution finishes, whether successful or not. The payload includes the number of records added, updated, and deleted, along with a `modifiedAfter` timestamp for incremental record fetching. By default, Nango sends a webhook even if no modified data was detected in the last sync execution, but this is configurable in your Environment Settings.

### External Webhook Forwarding

Nango can forward webhooks received from 3rd-party APIs. These are passed through to your configured webhook endpoint with the original payload attributed to the correct connection. You can also combine the two: process the webhook in Nango, fetch additional data from the external API, and then forward the final object as a webhook to your app.

### Webhook Verification

Validate webhooks from Nango by looking at the `X-Nango-Hmac-Sha256` header. It's an HMAC-SHA256 hash of the webhook payload, using the secret key found in the Environment Settings.
