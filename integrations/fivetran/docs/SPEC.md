# Slates Specification for Fivetran

## Overview

Fivetran is a managed data pipeline platform that automates data extraction from sources (SaaS apps, databases, events, files) and loads it into data warehouses, data lakes, and other destinations. It provides connectors for hundreds of data sources, manages schema changes automatically, and supports data transformations via dbt Core, dbt Cloud, and Coalesce integrations.

## Authentication

The Fivetran REST API uses API key authentication. You can authenticate with either a Scoped API key or a System key.

All API requests use this root URL: `https://api.fivetran.com/v1/`

### Scoped API Key

A Scoped API key is a key-secret pair tied to a specific user. These keys link actions to user permissions and can be generated in the Fivetran dashboard's API Keys section. The permissions of the key are determined by the user's RBAC (role-based access control) roles.

To generate a Scoped API key:

1. In the Fivetran dashboard, click your username → click API Key → click Generate new API key → click Generate new secret.

### System Key

A System key is an organization-managed API key–secret pair. Use System keys to replace user-oriented, scoped API keys. Instead of relying on RBAC to scope permissions, you set permission at the key level and manage them centrally.

### How to Authenticate

For each request to the API, send the Base64-encoded string `api_key:api_secret` in the Authorization HTTP header.

Example header:

```
Authorization: Basic <base64-encoded api_key:api_secret>
```

Or using curl:

```
curl -u "api_key:api_secret" https://api.fivetran.com/v1/...
```

## Features

### Group Management

Groups are organizational containers that hold destinations, connectors, users, transformations, logs and webhooks. You can create, update, delete, and list groups. You can also manage group membership by adding or removing users.

### Destination Management

You can create destinations within a specified group. Groups and destinations are mapped 1:1 to each other. Supported destinations include data warehouses and cloud storage services. You can configure destination-specific parameters such as time zone, data processing location, and connection credentials.

### Connection (Connector) Management

The API allows you to automate the deployment, configuration and management of connectors. You can create, update, pause, delete, and list connections. Key configuration options include:

- Sync frequency and schedule type (automatic or manual)
- Schema configuration (include/exclude specific tables and columns)
- Triggering manual syncs and historical re-syncs
- Running setup tests
- Connect Card — redirect end users to an embeddable setup flow so they can authorize without sharing credentials with you.

### Transformation Management

Transformations reshape data so that it's optimized for downstream processes. Transformations are automatically executed after connection syncs or on a set schedule. Via the API you can create, edit, run, and remove transformations and transformation projects. Scheduling options include integrated scheduling (triggered after sync), custom interval, cron, or time-of-day schedules.

### User, Team, and Role Management

You can list, invite, edit, and delete users; list predefined and custom roles; and list, edit, and delete teams, as well as manage team memberships and permissions.

### Connector Metadata

The API exposes metadata about available connector types, allowing you to discover supported sources and their configuration requirements.

### Connection Schema Management

You can retrieve and modify the schema configuration for a connection, including selecting which schemas, tables, and columns to sync or exclude.

### Log Service Management

You can list, create, edit, remove, and test log services to forward Fivetran logs to external logging platforms.

### Certificate Management

You can approve or manage TLS certificates and SSH fingerprints used for secure connections to sources and destinations.

### Hybrid Deployment Agent Management

You can list, create, re-authenticate, and remove Hybrid Deployment Agents, which allow running Fivetran connectors within your own infrastructure.

### Private Link and Proxy Agent Management

You can manage private links and proxy agents for secure network connectivity to sources and destinations.

### System Key Management

You can list, create, edit, remove, and rotate system keys for programmatic API access management.

### Account Management

You can retrieve and manage account-level settings and configurations.

## Events

Fivetran supports outbound webhooks that notify your application when specific events occur in your Fivetran account. You can create a webhook with Fivetran to fire in response to particular events. Webhooks can be scoped at the **account level** (all activity across the account) or **group level** (activity within a specific group).

When configuring a webhook, you can use the API to choose which events send you payloads. The webhook payload can be signed if you specified a secret during the webhook creation, using SHA-256 HMAC.

### Sync Events

- **`sync_start`** — Fires when a connection sync begins.
- **`sync_end`** — Fires when a connection sync completes.
- **`status`** — Fires when a connection's status changes.

### Transformation Events

- **`transformation_run_start`** — Fires when a transformation run begins.
- **`transformation_run_succeeded`** — Fires when a transformation run completes successfully.
- **`transformation_run_failed`** — Fires when a transformation run fails.

### dbt Run Events

- **`dbt_run_start`** — Fires when a dbt run begins.
- **`dbt_run_succeeded`** — Fires when a dbt run completes successfully.
- **`dbt_run_failed`** — Fires when a dbt run fails.

These event types are: `sync_start`, `sync_end`, `status`, `transformation_run_start`, `transformation_run_succeeded`, `transformation_run_failed`, `dbt_run_start`, `dbt_run_succeeded`, `dbt_run_failed`.
