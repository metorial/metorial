Now let me look at the full API reference to understand all the features:Now I have enough information. Let me also check if there's a Prisma Pulse product that provides real-time event streaming:Now I have comprehensive information. Note: The user asked about "Prisma" which refers to the **Prisma Data Platform** (the cloud platform with its Management API), not Prisma ORM (which is a code library, not an API service). The Management API is what's relevant for an integration platform. Let me compile the specification.

# Slates Specification for Prisma

## Overview

Prisma is a data platform that offers a managed PostgreSQL database service (Prisma Postgres), an ORM for Node.js/TypeScript, and related cloud services including connection pooling (Accelerate), query optimization (Optimize), and real-time database change streaming (Pulse). Prisma ORM is an open-source ORM that provides fast, type-safe access to Postgres, MySQL, SQLite, and other databases, while Prisma Postgres is a fully managed PostgreSQL database that scales to zero and integrates with Prisma ORM and Prisma Studio. The Prisma Management API allows programmatic provisioning and management of databases, projects, and workspaces on the Prisma Data Platform.

## Authentication

The Prisma Management API supports two authentication methods. All authenticated requests use a Bearer token in the `Authorization` header.

### Service Tokens

Service tokens are the simplest way to authenticate. They're ideal for scripts, CI/CD pipelines, and backend services. Service tokens do not have an expiration date. While this provides convenience for long-running integrations, it also means these tokens require careful security management.

To create a service token:

1. Log in to the Prisma Console.
2. Navigate to the Integrations tab.
3. Generate a service token and store it securely.

Usage: Include the token as `Authorization: Bearer <service-token>` in all API requests to `https://api.prisma.io/v1`.

### OAuth 2.0 with PKCE

OAuth 2.0 is required for applications that act on behalf of users. The API uses OAuth 2.0 with PKCE for secure authentication. The OAuth implementation supports Proof Key for Code Exchange (PKCE) using the S256 code challenge method: public clients (no client secret) require PKCE as mandatory, while confidential clients (with client secret) can optionally use PKCE.

**OAuth Endpoints:**

- Authorization URL: `https://auth.prisma.io/authorize`
- Token URL: `https://auth.prisma.io/token`
- Discovery endpoint: available for automatic client configuration

**Available Scopes:**

- `workspace:admin` — Full access to the user's workspace
- `offline_access` — Enables refresh tokens for long-lived sessions

**Setup:**

1. Click the Integrations tab in the Prisma Console. Under Published Applications, click New Application. Enter a Name, Description, and Redirect URI (the URL where users will be redirected after authorization). Click Continue, then copy and store your Client ID and Client Secret to a secure location.

**Token Lifetimes:**

- Access tokens expire after 3600 seconds (1 hour).
- Refresh tokens use single-use rotation with replay attack detection. When you exchange a refresh token for a new access token, you'll receive a new refresh token in the response. The old refresh token is immediately invalidated.

## Features

### Workspace Management

Manage workspaces that serve as organizational containers for projects. A user account can belong to multiple workspaces. A workspace typically represents a team of individuals working together on one or more projects. You can list workspaces and retrieve workspace details.

### Project Management

The Management API provides a set of endpoints that allow you to programmatically provision and manage Prisma Postgres databases. A project is a container that can hold multiple databases. You can create, list, retrieve, and manage projects within workspaces. Projects can be transferred to users, including all databases they contain.

### Database Provisioning and Management

Create, list, retrieve, and delete Prisma Postgres databases within projects. When creating a database, you specify a name and a region (e.g., `us-east-1`). Each database includes connection details such as a Prisma Postgres connection string, direct TCP connection host/port, username, and password.

### Database Connections

Manage database connection details including direct, pooled, and Accelerate endpoints. Each database can have multiple connections with different access configurations.

### Database Backups

Manage and retrieve backup information for Prisma Postgres databases.

### Database Usage

Monitor and retrieve usage statistics for databases.

### Integrations Management

Manage OAuth applications and integrations registered with the Prisma platform.

### Partner Database Provisioning and Claim Flow

The Management API allows partners to provision a Prisma Postgres database on their own workspace and then transfer it to another user's workspace so they can "claim" the database. This enables building experiences where databases are provisioned programmatically and ownership is transferred via OAuth 2.0.

## Events

The Prisma Data Platform Management API does not support webhooks or event subscriptions for platform-level resource changes (e.g., project created, database deleted).

However, **Prisma Pulse** (a separate product) provides real-time database change event streaming:

### Database Change Events (Prisma Pulse)

Prisma Pulse is a managed Change Data Capture (CDC) service that makes it easy to react to changes in your databases with type-safe model streams. It enables developers to build real-time apps by streaming database changes into their application.

- Streams create, update, and delete events on any database model/table.
- Database change events are guaranteed to be delivered with at least once semantics, and Prisma Pulse further guarantees to deliver the database change events in the order they were produced.
- If a name is provided, Pulse tracks delivery with a cursor. If a stream is unavailable (e.g., server downtime), it resumes at the last cursor position and delivers missed events.
- Prisma Pulse currently works with PostgreSQL databases that have logical replication enabled.
- Pulse is accessed via a Prisma Client extension (not the Management API), so it is not a traditional webhook mechanism but rather a purpose-built streaming/subscription system.
