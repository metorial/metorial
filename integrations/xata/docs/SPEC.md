Now let me check the newer Xata platform (it seems they've evolved) and confirm webhook support:Now let me check the new Xata REST API to understand the current feature set:Interesting - the new Xata documentation shows Organizations, API Keys, Projects, Branches, and Webhooks as API categories. Let me check the webhooks section:Now let me check the new Xata API reference which includes webhooks:I now have enough information. The new Xata platform documentation mentions "Webhooks" as an API reference section, and from the sidebar I can see it. The pgstream blog post discusses webhooks for Postgres CDC, but that's an open-source tool, not a built-in Xata API feature. The new documentation at `xata.io/documentation` shows the newer platform with Organizations, API Keys, Projects, Branches, and Webhooks sections. Let me also note that the older Xata (lite.xata.io) had the serverless data platform with records/search/aggregations, while the newer platform focuses more on Postgres branching.

Based on all my research, I can now construct the specification:

# Slates Specification for Xata

## Overview

Xata is a serverless PostgreSQL database platform that provides managed Postgres instances with copy-on-write database branching, zero-downtime schema migrations, and data anonymization. It also offers an optional search/analytics engine (powered by Elasticsearch), file attachments, vector search, and an AI-powered question-answering feature on top of your data.

## Authentication

Xata supports two authentication methods:

### API Keys (Bearer Token)

The Xata API uses API keys to authenticate users. Authentication is required using an API key associated with the workspace. Include the API key in the `Authorization` HTTP request header as a Bearer token (e.g., `Authorization: Bearer xau_YOUR_API_KEY`). To create an API key, visit the Account Settings page and click "+ Add a key", then enter a name and save.

Xata has two API contexts:

- **Core API** at `https://api.xata.io` — responsible for operations not bound to a specific workspace, including user management and workspace management.
- **Workspace API** at `https://{workspace-display-name}-{workspace-id}.{region}.xata.sh` — used when interacting with Xata properties within the bounds of a workspace, such as databases, tables, and records.
- **New platform API** at `https://api.xata.tech` — allows you to programmatically manage your databases, branches, and data.

### OAuth 2.0 (Authorization Code Flow)

Xata offers OAuth 2.0 authentication for external applications. Xata supports the Authorization Code Flow of OAuth2, designed for web applications that run on a server, not for mobile or desktop applications.

- **Authorization URL:** `https://app.xata.io/integrations/oauth/authorize`
- **Required parameters:** `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`
- **Token exchange:** POST to Xata's token endpoint with `client_id`, `client_secret`, `grant_type`, and `authorization_code` or `refresh_token`.
- At the moment, Xata only supports the scope `admin:all`, which allows the application to make requests on behalf of the user with the same permissions as an API key.
- Authorization codes expire after 10 minutes. Access tokens expire after 1 month. Refresh tokens can be used to obtain new access tokens.

## Features

### Record Management (CRUD)

Perform create, read, update, and delete operations on records within tables. Xata offers a transactions endpoint which allows you to execute multiple operations together as a single unit, supporting insert, update, delete, and get operations in a single request.

### Querying and Filtering

The Query Table API can be used to retrieve all records in a table and supports filtering, sorting, selecting a subset of columns, and pagination. You can choose between strong consistency (primary store) or eventual consistency (read replica).

### Free-Text Search

Run a free text search operation across the database branch or within a specific table. Search supports fuzziness, filtering, column boosting, and relevancy tuning. This feature runs against the Elasticsearch-based search store (eventually consistent). Available on Pro and Enterprise plans only.

### Vector / Similarity Search

Perform vector-based similarity searches in a table for implementing semantic search and product recommendation. Requires a column of type vector with a fixed dimension (2–10,000). The vector type can be used to store embeddings computed via machine learning models.

### Aggregations

The aggregation API allows you to use the search/analytics engine to perform aggregations on your data. Supports count, sum, average, min, max, unique count, date histograms, top values, percentiles, and nested sub-aggregations. Aggregations run in the optional search store, which is eventually consistent and cannot access linked fields. Available on Pro and Enterprise plans only.

### Summarize

Run calculations on groups of data directly from the transactional store (strongly consistent). Supports grouping by columns and running operations like count, sum, average, min, and max. This is an alternative to aggregations when strong consistency is required.

### Ask AI

Ask your table a question and have Xata answer. This feature uses AI to answer natural language questions about your data. It supports follow-up questions via session IDs and streaming responses.

### Database Branching

Xata is a branchable database, allowing you to set up dev environments and replicate data for experiments and feature development. Branches use copy-on-write to share storage with the parent so you only pay for changes. Dev branches can scale to zero, so you only pay for compute when active. Branches can be created from existing branches, including production.

### Schema Management and Migrations

Modify your database schema without downtime and deploy schema changes with confidence. Xata uses pgroll under the hood to support zero-downtime, reversible schema migrations that can serve old and new schema versions in parallel. You can query schema history for a branch.

### Data Anonymization

Automatically anonymize sensitive data and use real data safely in non-production environments. Useful for compliance with SOC2, HIPAA, and GDPR when working with branch copies.

### File Attachments

Xata offers general-purpose file attachment capabilities, integrating file support directly into the database. Files are managed via the `xata_file` and `xata_file_array` column types. Supports authenticated URLs, public URLs, signed URLs, and upload URLs. File attachments are delivered through an integrated CDN. Available on Pro and Enterprise plans only.

### Database and Workspace Management

Create, list, update, and delete databases and workspaces (organizations). Manage workspace members and invitations. Databases are scoped to regions and workspaces.

### Project Management

Create a new project to start managing your database environments and branches. Configure compute resources for your project including scale-to-zero capabilities and manual hibernation options.

### Replication / Data Streaming

Set up continuous streaming from your production PostgreSQL database to Xata. Connect to external Postgres providers (AWS RDS, Cloud SQL, Azure Database, self-hosted) and use Xata for branching and development workflows on top.

## Events

The Xata platform API includes a Webhooks section in its API reference, indicating support for webhook-based event notifications. Based on the available documentation, Xata's newer platform (at `api.xata.tech`) exposes webhook management endpoints. However, detailed documentation on the specific event types, configuration options, and payload formats for these webhooks is limited in publicly available sources.

Additionally, Xata's open-source tool **pgstream** can be used alongside Xata to set up CDC-based webhooks on Postgres data and schema changes (inserts, updates, deletes, truncates, and DDL changes), but this is a separate tool and not a built-in API feature of the Xata platform itself.
