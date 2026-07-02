Now I have a comprehensive understanding of the Databox API. Let me compile the specification.

# Slates Specification for Databox

## Overview

Databox is a business analytics platform that consolidates KPIs and metrics from hundreds of data sources into dashboards, reports, and alerts. It provides a REST API (v1) that allows programmatic data ingestion, data source management, and dataset operations, enabling users to push custom data from any external system into Databox for visualization and analysis.

## Authentication

Databox uses **API Key** authentication for its v1 API. To access the API, you must authenticate requests using an API key. Support for OAuth 2.0 is coming soon.

**Obtaining an API Key:**
Go to your Profile page (Account Management > Profile). In the Password & Security section, find the API key option. Click Create to generate a new key.

Access to API key management is currently limited to Admin users.

**Usage:**
The API key is passed via the `x-api-key` header on all requests to `https://api.databox.com`.

**Key Properties:**

- API keys are user-specific. Each key inherits the access rights and permissions of the user who created it.
- You can optionally restrict usage of your API key to specific IP addresses by clicking Manage allowed IPs and entering one or more IP addresses. Only requests coming from the specified IPs will be accepted.

**Validation:**
Use `GET /v1/auth/validate-key` to validate the API key supplied in the x-api-key header. Use this endpoint as a setup/health check. Integration partners can call it to confirm a customer's key before enabling data ingestion or completing account linking.

**Legacy Push API (v0):**
The deprecated v0 Push API uses a different token-based authentication via HTTP Basic Auth (token as username, no password) against `https://push.databox.com`. This version is no longer recommended for new implementations.

## Features

### Account Management

Retrieve a list of Databox accounts the authenticated user has access to and their associated data sources. This is needed to identify the correct account ID for creating data sources and ingesting data.

### Data Source Management

A data source serves as a logical container for the datasets you'll send to Databox. You can think of it as the equivalent of an integration or connection within your Databox account. You can create and delete data sources, configure their timezone, and list all datasets belonging to a data source.

- Each data source requires a title and optionally an account ID and IANA timezone string.
- Deleting a data source permanently removes all its datasets and data.

### Dataset Management

The Databox API (v1) is dataset-based, meaning you create containers for data and then ingest records into them. Datasets are created within a data source and can define primary keys to uniquely identify rows.

- You can create, delete, and purge (clear all data without deleting the structure) datasets.
- Primary keys can be specified to control how rows are identified and updated.

### Data Ingestion

Push structured, row-level data into datasets. You can send data to Databox as frequently as needed, including real-time or event-based updates. Data is sent as JSON payloads to a dataset's ingestion endpoint.

- Each ingestion is tracked with a unique ingestion ID.
- You can list all ingestion events for a dataset and retrieve details about a specific ingestion, including metrics about the outcome (rows processed, errors, etc.).

### Timezone Support

Retrieve a full list of supported IANA timezones to configure data sources correctly for visualization purposes.

### Dataset Enrichment (In-Platform)

Beyond visualization, Databox offers tools to manage and enrich datasets: Add calculated columns to create new columns derived from existing data using formulas. Merge datasets to combine multiple datasets into a single, unified dataset to consolidate related information. These operations are performed within the Databox platform, not via API.

### MCP (Model Context Protocol) Integration

Databox MCP is a Model Context Protocol server that connects your AI tools to your Databox data. It provides a standardized way for AI applications (like ChatGPT, Claude, or custom agents) to ingest data into Databox and query it using natural language.

- MCP uses OAuth 2.0 for authentication (separate from the API key auth used for the REST API).
- Compatible with MCP-enabled AI clients such as Claude, ChatGPT, and Cursor.

## Events

The provider does not support events. Databox does not offer webhooks, event subscriptions, or purpose-built polling mechanisms through its API.
