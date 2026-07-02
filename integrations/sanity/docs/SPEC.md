# Slates Specification for Sanity

## Overview

Sanity is a headless content management system (CMS) that stores structured content in a cloud-hosted data store called the Content Lake. It provides APIs for querying content using GROQ (Graph-Relational Object Queries) or GraphQL, mutating documents, managing digital assets, and controlling access. Content is organized into projects, each containing one or more datasets.

## Authentication

Sanity uses bearer tokens for authentication, which are attached to all API requests in the HTTP `Authorization` header (e.g., `Authorization: Bearer <token>`).

There are two types of tokens:

**Personal Tokens:**

- Generated automatically when logging in via Sanity Studio or CLI (`sanity login`).
- Personal tokens last for one year by default (shorter with SAML SSO).
- Personal tokens give complete access as your user. Use robot tokens instead for applications and third-party services.

**Robot Tokens (recommended for integrations):**

- For authenticating from applications or third-party services, generate a dedicated robot token with appropriate permissions.
- Project robot tokens can only perform actions on an individual project. To create one, navigate to your project's management console at Settings > API > Tokens.
- Token permissions vary by plan. On a Free plan, the role must be `viewer`, `editor`, or `deploy-studio`.
- Once a token is generated, it is displayed exactly once and cannot be recovered later.

**Organization-wide Robot Tokens:**

- Used for scenarios where you need access to manage multiple projects, deploy or manage SDK apps, or access data in organization-wide apps like Media Library or Canvas.
- Requires developer or equivalent role in the organization. Created via organization management console at Settings > API > Tokens.

**Required parameters for API calls:**

- **Project ID**: Identifies your Sanity project. Found in project settings.
- **Dataset**: The dataset name (e.g., `production`).
- **API Version**: A date string (e.g., `2021-06-07`) that must be specified for stable behavior.
- API base URL format: `https://<projectId>.api.sanity.io/v<apiVersion>/`

## Features

### Content Querying (GROQ)

GROQ (Graph-Relational Object Queries) allows describing exactly what information your application needs, joining information from several sets of documents, and returning a specific response with only the exact fields needed. Supports filtering, projections, ordering, slicing, and references across documents within a dataset. Queries can be run against public datasets without authentication, but private or draft content requires a token.

### Content Querying (GraphQL)

Sanity supports deploying a GraphQL API generated from your schema, but GROQ is the recommended query language. Mutations are not exposed through the GraphQL API. GraphQL schemas must be explicitly deployed and are read-only.

### Document Mutations

The Mutate API allows making changes to documents in a dataset, supporting operations such as creating, updating, and deleting documents. Mutations can be grouped in transactions for atomicity. Supports patching documents with set, unset, increment, decrement, and insert operations.

### Asset Management

Sanity provides an API for storage, resizing, and deletion of assets. Assets are files such as images, PDFs, and other media that exist alongside structured content. Images can be transformed on the fly with parameters for resizing, cropping, and format conversion. Metadata can be extracted from images, including color palettes, camera information, and location data.

### Media Library

The Media Library API supports creating, updating, and deleting documents using the same mutation syntax as Content Lake. It also supports GROQ queries for retrieving assets. Media Library is an organization-wide feature for managing assets across projects, including video assets.

### Dataset Management

A dataset is a collection of JSON documents that can be of different types with references to each other. Using GROQ or GraphQL you can query and join data across documents within a dataset, but not across them. You can export and import content to datasets, as well as performing mutations and patches to documents in them.

### Document History and Revisions

The API can return a document as it was at a point in the past, behaving like the regular document endpoint but applying current access control for every revision. Transaction logs containing NDJSON for given document IDs are also available.

### Embeddings / Vector Search

The Sanity Embeddings Index API enables the creation, management, and search of named embeddings vector indexes. You can create indexes, query them with semantic search, and retrieve documents with relevance scores.

### Access Control

The Roles system provides granular capabilities attached to specific groups of users, with strong defaults and an API for creating and managing custom roles. Custom roles are available for Enterprise customers. The Access API manages roles, permissions, invitations, and user membership across projects and organizations.

### Project Management

The Projects API allows creating, updating, and deleting projects, managing CORS origins, and managing API tokens programmatically.

### Real-time Listening

Sanity supports real-time document listeners that emit events when documents matching a query are created, updated, or deleted. Update events contain the mutation and a result property with the document after mutation is applied.

## Events

Sanity supports GROQ-powered webhooks that fire HTTP requests when content in the Content Lake changes.

### Document Webhooks

Sanity provides document webhooks that trigger every time a document is created, updated, or deleted. These are the preferred webhook type.

- **Trigger types**: Webhooks can be triggered when a document is created, updated, deleted, or any combination of these.
- **GROQ Filtering**: A GROQ filter specifies which documents will trigger the webhook when changed. It supports all standard GROQ functions plus delta-namespace functions and `before()`/`after()` for comparing document state.
- **Custom Projections**: A GROQ projection can define the payload of the outgoing webhook request. If left empty, it includes the whole document after the change.
- **Dataset scoping**: Webhooks can be scoped to a specific dataset or `*` for all datasets in the project.
- **Draft and version documents**: By default, webhooks will not trigger on draft or version events. This can be configured to include draft and version document changes.
- **HTTP method**: The webhook's HTTP request method can be configured to POST, PUT, PATCH, DELETE, or GET.
- **Secret verification**: A secret can be added that will be hashed and included in the webhook request headers for origin verification.
- **Custom headers**: Additional HTTP headers can be added to the webhook request.

### Transaction Webhooks

A second webhook type is transaction-based. The `type` property in the webhook configuration distinguishes between `document` and `transaction` webhooks. Transaction webhooks fire based on raw transactions rather than individual document changes.
