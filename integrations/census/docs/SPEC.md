I see there's ambiguity — "Census" could refer to the getcensus.com reverse ETL platform or the U.S. Census Bureau. Given the context of Slates as an integration platform, the provider is most likely **Census (getcensus.com)**, the reverse ETL / data activation platform. Let me get more details on their API.Now let me get more details on Census webhooks and the full API feature set.It seems the Census docs have been migrated to Fivetran. Let me get the original Census webhook docs.Now I have enough information to write the specification. Let me also check on the webhook event types more closely.Now let me check what webhook event types are available beyond the ones shown.I now have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Census

## Overview

Census (getcensus.com) is a reverse ETL and data activation platform that syncs data from cloud data warehouses (such as Snowflake, BigQuery, Redshift, and Databricks) into 200+ business applications like CRMs, marketing platforms, and support tools. Census is a reverse ETL platform that syncs customer data from your lakehouse into downstream business tools such as Salesforce, HubSpot, and Google Ads. It also provides an Audience Hub for building and managing audience segments directly on the warehouse.

## Authentication

Census uses **Bearer token authentication** for its Management APIs. There are two separate token types depending on the API scope:

### Workspace API Key (for Workspace APIs)

- Used to manage resources within a specific workspace (syncs, connections, datasets, etc.).
- Retrieve the token from the workspace settings under the "API Access" section.
- Include in requests as: `Authorization: Bearer YOUR_WORKSPACE_ACCESS_TOKEN`

### Personal Access Token (for Organization APIs)

- Used to manage organization-level resources (workspaces, users, invitations).
- Organization APIs allow you to manage resources that belong to your organization (e.g., workspaces, users, invitations). They are authenticated via personal access tokens.
- Generate from the user settings page under "Personal Access Tokens."
- The token inherits the permissions of the user who creates it. Admin-level actions require a token created by an admin user.
- Include in requests as: `Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN`

### Base URLs

- To call Census' API, use the base URL associated with your Census organization's region. US-based organizations use `https://app.getcensus.com`, EU-based organizations use `https://app-eu.getcensus.com`.

## Features

### Sync Management

Create, configure, trigger, and manage data syncs that move data from sources (data warehouses) to destinations (SaaS tools). The Management API lets you integrate core pieces of Census's functionality right into your workflows. You can view information about your connections and syncs, as well as create and trigger syncs. Syncs support multiple behaviors including upsert, update-only, create-only, mirror (full sync with deletes), append (event-style), and delete. Syncs can be scheduled via cron expressions, intervals, continuous mode, or triggered programmatically via the API.

### Sync Run Monitoring

View the status and detailed results of individual sync runs, including record counts for processed, updated, failed, invalid, and deleted records. Typically, apps that embed Census will show statuses like "Running" or "Completed", along with information about sync progress.

### Source and Destination Management

List available source types (data warehouses) and destination types (SaaS applications), and manage connections to them programmatically. Census supports connecting to sources like Snowflake, BigQuery, Redshift, Databricks, and 20+ others, and destinations including Salesforce, HubSpot, Braze, Google Ads, and 200+ others. Connect Links allow generating embeddable authorization flows for end users to connect their own sources and destinations.

### Dataset API

Dataset API is designed to make your Datasets even more valuable by making them easily accessible to the wider app ecosystem. In addition to using Census Syncs to push data to destinations, you can now make your data available to be pulled by your applications. Allows listing datasets and retrieving individual records by primary key. A given API key is scoped to a single Census Workspace and all datasets within that workspace will be accessible.

- Available only on the Enterprise Plan.

### Organization & User Management

Manage workspaces, users, and invitations at the organization level. Create and configure workspaces, list and manage user accounts, and send or manage workspace invitations programmatically.

### Webhook Management

Create, update, list, and delete webhooks that notify external endpoints when sync lifecycle events occur. Webhooks are configured per workspace and require an HTTPS endpoint.

### Custom Destinations

The Custom Destination API allows you to "bring your own" destination to Census. A custom destination is a few simple API endpoints that tell Census about the type of data your destination can process, the operations allowed on that data, and how to actually load that data.

### Embedded Reverse ETL

Census Embedded Reverse ETL allows you to offer reverse ETL capabilities within your customer-facing application easily and securely. Includes Connect Links for sources and destinations, and Sync Management Links for embedding sync configuration UIs into your own application.

## Events

Census supports webhooks for sync lifecycle events. Webhooks can be created and managed via the API and are scoped to a workspace. Each webhook requires a name, an HTTPS endpoint URL, and optionally a list of event types to filter on.

### Sync Alert Events

- **`sync.alert.raised`** — Fired when a sync alert condition is triggered (e.g., sync failure, record count deviation, runtime exceeded).
- **`sync.alert.resolved`** — Fired when a previously raised sync alert condition is resolved.
- If no specific events are specified, the webhook receives all event types by default.
- Each webhook can be configured with an optional description and filtered to specific event types.
