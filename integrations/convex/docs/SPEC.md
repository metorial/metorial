Now I have enough information to write the specification. Let me also check the Management API and streaming export for event/webhook capabilities.

# Slates Specification for Convex

## Overview

Convex is a backend-as-a-service platform that provides a reactive document-relational database, serverless TypeScript functions (queries, mutations, and actions), file storage, scheduling, full-text search, and vector search. It offers real-time data synchronization to clients via WebSockets and can be interacted with through client SDKs or a public HTTP API. Convex can be used as a hosted cloud service or self-hosted.

## Authentication

Convex supports multiple authentication methods depending on the API surface being accessed:

### 1. Deploy Key (Admin Key)

Used for administrative operations such as invoking functions, streaming export, and streaming import. The deploy key is obtained from the Convex dashboard under deployment settings.

- **Header:** `Authorization: Convex <deploy_key>`
- Grants full read and write access to all data and functions in a deployment.

### 2. User Bearer Token (Functions API)

Used to authenticate function calls (queries, mutations, actions) as a specific end-user. The token is a JWT issued by a configured auth provider (e.g., Clerk, Auth0).

- **Header:** `Authorization: Bearer <access_token>`
- The deployment must be configured with the auth provider's JWKS endpoint to verify tokens.

### 3. OAuth 2.0 (Management & Platform APIs)

Used by third-party applications to manage Convex projects and deployments on behalf of users. Convex implements the OAuth 2.0 Authorization Code Grant with optional PKCE (S256).

- **Authorization Endpoints:**
  - Team-scoped: `https://dashboard.convex.dev/oauth/authorize/team`
  - Project-scoped: `https://dashboard.convex.dev/oauth/authorize/project`
- **Token Endpoint:** `https://api.convex.dev/oauth/token`
- **Token Scopes:**
  - **Team-scoped:** Can create projects, deployments, and access all projects on the team.
  - **Project-scoped:** Can create deployments and access data/functions within a specific project.
- Requires registering an OAuth application in Team Settings to obtain a `client_id` and `client_secret`. Redirect URIs must be pre-registered. Unverified apps can only access the creator's own team.

### 4. Team Access Token

For managing your own team's projects programmatically without OAuth. Obtained from Team Settings in the Convex dashboard.

- **Header:** `Authorization: Bearer <team_access_token>`
- Used with the Management API at `https://api.convex.dev/v1/`.

## Features

### Function Invocation via HTTP

Call any deployed Convex query, mutation, or action function over HTTP by specifying the function path and arguments. Functions are invoked at `<DEPLOYMENT_URL>/api/query`, `/api/mutation`, `/api/action`, or `/api/run/{functionIdentifier}`. This allows any external system to read or write data and trigger server-side logic without using a Convex client SDK.

### Database Operations

Convex provides a document-relational database with ACID transactions and strong consistency. Through server functions exposed via the HTTP API, you can read, insert, update, and delete documents across tables. Tables support custom indexes, including on nested fields. Schema definitions are optional but provide runtime validation.

### File Storage

Upload, store, and serve files (images, documents, etc.) of any type. Files are stored in Convex's built-in storage and referenced by ID in the database. Files can be uploaded from clients or stored programmatically from server actions.

### Scheduling and Cron Jobs

Schedule functions to run once at a future time or on a recurring schedule (cron). Useful for deferred tasks, background processing, periodic syncs, and multi-step workflows that survive deployments and restarts.

### Full-Text Search

Search documents using keyword-based full-text search with BM25 relevance scoring. Supports prefix matching for as-you-type search experiences. Requires defining search indexes on table fields in the schema, with support for filter fields for scoped queries.

### Vector Search

Find documents by semantic similarity using vector embeddings. Vector indexes are defined in the schema and queried from actions. Supports filtering by additional fields. Useful for AI/RAG applications, recommendations, and similarity matching.

### Real-Time Subscriptions

Clients connected via WebSocket automatically receive live updates when query results change. This is a core feature of the platform — queries are reactively re-evaluated when underlying data changes, and deltas are pushed to all subscribed clients.

### Streaming Export

Export data out of Convex incrementally via the Streaming Export API. Supports full snapshot reads and delta-based synchronization to keep external systems in sync. Integrates with Fivetran and Airbyte for streaming to data warehouses and other destinations. Requires admin (deploy key) authorization.

### Streaming Import

Import data into Convex tables incrementally from external sources. Supports Airbyte and Fivetran source connectors. Useful for mirroring external databases into Convex or migrating data.

### Project and Deployment Management

Via the Management API (`https://api.convex.dev/v1/`), create and manage teams, projects, and deployments programmatically. Create deploy keys, push code, and manage environment variables. An OpenAPI spec is available at `https://api.convex.dev/v1/openapi.json`.

### HTTP Actions (Custom Endpoints)

Deployments can define custom HTTP endpoints (HTTP Actions) for receiving inbound webhooks or serving REST-style APIs. These are defined in a `convex/http.ts` file and deployed alongside functions.

### Components

Drop-in backend modules (similar to npm packages) that provide pre-built functionality with isolated data and transactional guarantees. Available components include integrations for Stripe, rate limiting, authentication, RAG, and more.

## Events

Convex does not provide a built-in outbound webhook or event subscription system for notifying external services when data changes.

However, Convex's **Streaming Export API** provides a cursor-based change feed that can be used as a polling mechanism to detect document-level changes (inserts, updates, deletes) across all tables. This is a purpose-built mechanism for tracking data changes incrementally:

- **Document Deltas:** Returns a stream of document changes since a given cursor, including the table name, document ID, and the new document state (or deletion marker).
- **Configurable:** Consumers provide a cursor and receive all changes that occurred after that point, with a `hasMore` flag for continued polling.
- Requires admin (deploy key) authorization.
