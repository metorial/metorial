# Slates Specification for Cloudflare Workers

## Overview

Cloudflare Workers is a serverless compute platform that runs JavaScript, TypeScript, and WebAssembly code on Cloudflare's global edge network. It supports scheduling cron jobs, running durable Workflows, integrating with Queues, and connecting to storage services like KV, D1, R2, and Durable Objects through bindings. The Cloudflare API allows programmatic management of Worker scripts, versions, deployments, secrets, routes, and associated resources.

## Authentication

Cloudflare supports two authentication methods for its API:

### API Tokens (Recommended)

API Tokens provide a way to authenticate with the Cloudflare API. They allow for scoped and permissioned access to resources and use the RFC-compliant Authorization Bearer Token header.

- Created via the Cloudflare dashboard under **My Profile > API Tokens** (for user tokens) or **Manage Account > API Tokens** (for account tokens).
- After selecting a permissions group (Account, User, or Zone), choose what level of access to grant the token. Most groups offer Edit or Read options. Edit is full CRUDL access, while Read is the read permission and list where appropriate.
- For Workers management, the token needs the **Workers Scripts** permission (Read and/or Edit) on the relevant account.
- Passed in the `Authorization` header: `Authorization: Bearer <API_TOKEN>`
- Account API tokens can be used as service tokens that are not associated with individual users.
- Requires an **Account ID**, found in the Cloudflare dashboard, to construct API request URLs.

### Global API Key (Legacy)

Global API Key is the previous authorization scheme for interacting with the Cloudflare API. When possible, use API tokens instead of Global API key.

- API Keys are globally-scoped keys that carry the same permissions as your account.
- Passed via two headers: `X-Auth-Email: <EMAIL>` and `X-Auth-Key: <API_KEY>`
- Lacks advanced limits on usage — API tokens can be limited to specific time windows and expire or be limited to use from specific IP ranges.

**Base URL:** `https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/`

## Features

### Worker Script Management

Create, list, update, download, and delete Worker scripts within an account. Workers are standalone resources that can be created and configured without any code. Platform teams can provision Workers with the right settings, then hand them off to development teams for implementation.

### Version and Deployment Management

Creating a version and deploying it are now explicit, separate actions. To update version-specific settings (like bindings), you create a new version with those changes. The existing deployed version remains unchanged until you explicitly deploy the new one. You can list, create, inspect, and delete versions and deployments independently. Supports gradual deployments for rolling out changes incrementally.

### Secrets Management

Secrets are a type of binding that allow you to attach encrypted text values to your Worker. Secrets are used for storing sensitive information like API keys and auth tokens. The API supports listing, adding, retrieving metadata for, and deleting secrets on a per-script basis. Secret values are not visible within Wrangler or Cloudflare dashboard after you define them.

### Worker Settings and Bindings Configuration

Get and patch metadata and config, such as bindings or usage model. Bindings connect Workers to external resources including KV namespaces, Durable Objects, R2 buckets, D1 databases, Queues, Hyperdrive, Vectorize indexes, and environment variables.

### Cron Triggers (Scheduled Execution)

Cron Triggers allow users to map a cron expression to a Worker using a scheduled() handler. Cron Triggers are ideal for running periodic jobs, such as for maintenance or calling third-party APIs to collect up-to-date data. The API allows fetching and updating cron triggers for a Worker. Cron Triggers execute on UTC time.

### Custom Domains and Routes

Lists all Worker Domains for an account. Attaches a Worker to a zone and hostname. Detaches a Worker from a zone and hostname. Routes map URL patterns on your zones to specific Workers.

### Subdomain Management

Enable or disable the Worker on the workers.dev subdomain. Each account gets a configurable `*.workers.dev` subdomain for hosting Workers.

### Observability and Telemetry

List all the keys in your telemetry events. Run a temporary or saved query against Workers observability data. This enables querying logs, metrics, and analytics across all Workers in an account.

### Tail (Real-Time Log Streaming)

Get list of tails currently deployed on a Worker. Starts a tail that receives logs and exception from a Worker. Tails open a WebSocket connection for real-time log streaming. A reference to a script that will consume logs from the attached Worker (Tail Consumers) can also be configured for persistent log processing.

### Logpush

Workers Trace Events Logpush extends wrangler tail functionality — you can use it to send Workers logs to an object storage destination or analytics platform of your choice. Workers Logpush includes metadata about requests, console.log() messages and any uncaught exceptions. Supports filtering and sampling.

### Workers for Platforms (Dispatch)

Enables multi-tenant use cases where you can manage user-deployed Workers under a dispatch namespace, allowing platforms to run third-party code on behalf of their customers.

## Events

The provider does not support webhooks or event subscriptions in the traditional sense. Cloudflare Workers does not offer a webhook system where you can register a callback URL to receive notifications about changes to Worker resources (e.g., deployment completed, script updated).

The **Tail** API provides real-time log streaming via WebSocket, but this is a live debugging tool rather than an event subscription mechanism. **Logpush** can push Workers execution logs to external destinations, but is a log-forwarding pipeline rather than an event notification system.
