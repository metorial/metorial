The webhook search returned results about Microsoft Graph, not Grafbase. Let me look specifically at Grafbase's features more carefully.Now I have enough information to write the specification. Based on my research, the Grafbase Management API is a GraphQL API, authentication uses personal access tokens or organization access tokens with Bearer format, and there's no evidence of webhook/event support in the platform API.

# Slates Specification for Grafbase

## Overview

Grafbase is a GraphQL Federation platform that provides a gateway for composing unified APIs from multiple subgraphs and data sources. It offers a management API (GraphQL) to programmatically manage accounts, organizations, graphs, schema registry, and schema checks — mirroring everything available in the Grafbase Dashboard.

## Authentication

Grafbase uses **Bearer token authentication** via access tokens. There are two types of access tokens:

### Personal Access Tokens

- Used for the Grafbase CLI and Management API.
- Inherit the same permissions as the corresponding user account.
- Created from the [account settings > access tokens](https://app.grafbase.com/settings/access-tokens) page.
- Tokens do not expire; they must be manually revoked when no longer needed.
- Tokens cannot be read or modified after creation.

### Organization Access Tokens

- Used for the Grafbase Gateway telemetry and Graph Delivery Network.
- Belong to an organization (persist even if the creating user is removed).
- Scopes:
  - **All Graphs**: Access all graphs within the organization.
  - **Specific Graphs**: Access limited to selected graphs only.
- Created from the organization settings > access tokens page.
- Tokens do not expire; they must be manually revoked when no longer needed.

### Usage

All requests are made to the GraphQL endpoint:

```
POST https://api.grafbase.com/graphql
```

Pass the token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <TOKEN>
```

For self-hosted Enterprise Platform instances, the API URL will be specific to your deployment (e.g., `https://grafbase-ep.mydomain.org/graphql`). Set the `GRAFBASE_API_URL` environment variable accordingly.

## Features

### Account and Organization Management

Manage user accounts and organizations programmatically. This includes creating organizations, managing memberships, and configuring organization settings.

### Graph and Project Management

Create, configure, and manage federated graphs and projects. Everything available in the Grafbase Dashboard can be done through the API.

### Schema Registry

Publish and manage subgraph schemas. The schema registry tracks all subgraph schemas and composes them into a unified supergraph. Supports branch-aware development environments for schema versioning.

### Schema Checks

Run composition checks against the federated graph schema to detect breaking changes before they go live. Integrates into CI/CD workflows.

### Schema Proposals

Design, discuss, and govern schema changes through collaborative proposal workflows. Supports approval processes for schema modifications.

### Access Token Management

Create and revoke personal and organization access tokens programmatically.

### Audit Logs

Access audit logs for tracking actions and changes within the organization for compliance and security purposes.

### Observability and Analytics

Access traces, metrics, logs, and operation analytics for your federated graphs. The platform integrates with OpenTelemetry.

- The API is GraphQL-based with introspection enabled, so the full schema can be explored via any GraphQL playground.
- The API may introduce breaking changes at any point, as noted in the documentation.

## Events

The provider does not support events (webhooks or event subscriptions) through the Management API.
