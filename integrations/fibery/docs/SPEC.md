Now let me get the webhook-specific documentation:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Fibery

## Overview

Fibery is a work management platform with customizable workspaces consisting of interconnected databases (called Types), entities, documents, and views. It provides both a REST-like command API and a GraphQL API for managing workspace schemas, entities, documents, files, and automations. Workspaces are tenant-scoped at `{account_name}.fibery.io`.

## Authentication

Fibery uses **token-based authentication**. An API token must be passed with every request via the `Authorization` header in the format `Authorization: Token YOUR_TOKEN`.

- **Obtaining a token:** Tokens can be generated from the "API Tokens" page in workspace settings, or programmatically by calling `POST /api/tokens` (requires existing authentication via browser cookie or existing token).
- **Token management endpoints:**
  - `GET /api/tokens` — list all tokens for the current user
  - `POST /api/tokens` — create a new token
  - `DELETE /api/tokens/:token_id` — delete a token
- **Limit:** Maximum of 2 tokens per user.
- **Scope:** The token carries the same privileges as the user who created it. There are no granular scopes — the token inherits full user permissions.
- **Workspace-scoped:** Each token is tied to a specific workspace. A separate token is needed for each workspace (`{account_name}.fibery.io`).

**Required inputs for authentication:**

1. **Account name** (workspace subdomain, e.g., `my-company` for `my-company.fibery.io`)
2. **API token**

**Example:**

```
curl -X POST "https://my-company.fibery.io/api/commands" \
     -H "Authorization: Token a1b2c3d4.sdfab89766532g91aye2nd38d4dls23ya17ks" \
     -H "Content-Type: application/json"
```

## Features

### Schema Management

Create, rename, and delete Types (databases) and Fields within a workspace. Supports primitive fields (text, numbers, dates, booleans, etc.), relation fields (one-to-one, one-to-many, many-to-many), single-select enum fields, and rich text document fields. Schema metadata can be retrieved to discover all Types and their Fields in a workspace.

### Entity CRUD

Read, create, update, and delete entities (records) within any Type. Querying supports field selection (including nested relations), filtering with various operators, ordering, and pagination. Entity collection fields (relations) can be updated by adding or removing linked items. Single-select and entity relation fields are set via their `fibery/id`.

### Rich Text Documents

Each rich text field is backed by a collaborative document. Documents are accessed via a two-step process: first retrieve the document's `secret` from the entity, then read/write the document content via the `/api/documents` endpoint. Supports Markdown, HTML, and JSON formats.

### Comments

Add comments to entities that have the Comments extension installed. Comments are entities themselves with an author and content stored as a collaborative document.

### File Management

Upload files (from local storage or URL), download files, and attach/detach files to entities. Files are identified by a `fibery/id` (for linking) and a `fibery/secret` (for storage access).

### Views Management

Create, read, update, and delete views (boards, tables, timelines, etc.) within spaces via a JSON-RPC endpoint at `/api/views/json-rpc`.

### GraphQL API

A separate GraphQL API is available per space at `https://{account}.fibery.io/api/graphql/space/{space_name}`. Allows reading and mutating entities with standard GraphQL queries and mutations. Each space auto-generates its own GraphQL schema based on its Types and Fields.

### Automations (Scripts)

Fibery supports programmable automation scripts (JavaScript/Node.js) that can be attached to rules and action buttons. Scripts can create/update/delete entities, manage documents, assign users, change states, and make external HTTP requests.

## Events

Fibery supports **webhooks** for subscribing to entity changes.

### Entity Changes

Subscribe to changes on entities of a specific Type. When entities of the subscribed Type are created, updated, or have collection items added/removed, Fibery sends a POST request to the configured URL with an array of effects.

- **Configuration:** Requires a target URL and a Type name (e.g., `Cricket/Player`). Webhooks are managed via the `/api/webhooks/v2` endpoint.
- **Payload:** Each webhook delivery includes a `sequenceId`, `authorId`, `creationDate`, and an array of `effects`. Each effect contains the effect type (`fibery.entity/update`, `fibery.entity/create`, `fibery.entity/add-collection-items`, etc.), the entity ID, current values, and previous values (for updates).
- **Correlation:** A `correlationId` can be sent with API commands and will be included in the corresponding webhook event for matching.
- **Limitations:** Rich text field changes are not included in webhook payloads. There is no UI for managing webhooks — they must be managed via API. Webhooks are scoped to a single Type per subscription.
