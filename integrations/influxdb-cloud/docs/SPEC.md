# Slates Specification for InfluxDB Cloud

## Overview

InfluxDB Cloud is a managed time-series database platform by InfluxData, designed for storing, querying, and analyzing high-velocity time-series data. It is a hosted and managed version of InfluxDB v2.0, designed to handle high write and query loads. It is commonly used for monitoring metrics, IoT data collection, and event tracking, and supports data querying via Flux and InfluxQL languages.

## Authentication

InfluxDB Cloud authenticates API requests using **API tokens**. InfluxDB uses API tokens to authorize API requests and filters API requests and response data based on the permissions associated with the token.

**Token-based authentication (primary method):**

Include the API token in the `Authorization` header with each request:

```
Authorization: Token YOUR_API_TOKEN
```

The `Authorization: Bearer YOUR_API_TOKEN` scheme is also supported and is equivalent.

**Required inputs for authentication:**

- **API Token**: Generated from the InfluxDB Cloud UI or API. InfluxDB only allows access to the API token value immediately after the token is created, and you can't change access (read/write) permissions for an API token after it's created.
- **Cloud URL**: The region-specific InfluxDB Cloud endpoint (e.g., `https://us-east-1-1.aws.cloud2.influxdata.com`). The URL varies by cloud provider and region.
- **Organization ID or name**: Most API requests require a minimum of your InfluxDB URL, organization, and authorization token.

**Token types:**

- **All Access Token**: Grants full read and write access to all resources in an organization.
- **Read/Write Token**: Grants read access, write access, or both to specific buckets in an organization.
- **Custom API Token**: Grants fine-grained read/write permissions on specific resource types (buckets, tasks, dashboards, Telegraf configurations, users, authorizations, etc.).

**Basic authentication (v1 compatibility):**

With InfluxDB v1-compatible endpoints, you can use API tokens in InfluxDB 1.x username and password schemes or in the InfluxDB v2 Authorization: Token scheme. When authenticating requests to the v1 API endpoints, InfluxDB Cloud checks that the password (p) value is an authorized API token, and ignores the username (u) parameter.

## Features

### Data Writing

Write time-series data to InfluxDB Cloud buckets using the line protocol format. Data is written to specific buckets and can include measurements, tags, fields, and timestamps. Supports configurable timestamp precision (nanoseconds, microseconds, milliseconds, seconds).

- Data is organized into **buckets**, which are named storage locations with configurable retention periods.
- The default data retention period is 30 days.
- Supports both the v2 write API and v1-compatible write endpoints.

### Data Querying

Query stored time-series data using Flux (InfluxDB's functional scripting language) or InfluxQL (SQL-like query language for v1 compatibility).

- Flux supports complex transformations, aggregations, joins, and custom functions.
- Results can be returned in CSV or JSON formats.
- Supports parameterized queries for dynamic inputs.
- The v1-compatible query endpoint supports InfluxQL for third-party integrations like Grafana.

### Bucket Management

Create, list, update, and delete buckets (data storage containers) within an organization.

- Each bucket has a configurable retention period defining how long data is kept.
- InfluxDB Cloud Free Plan allows users to create up to two buckets.

### Task Management

Tasks are scheduled Flux scripts that run on a defined frequency to process, transform, or downsample data.

- A task is a Flux query that runs on a schedule or defined frequency.
- Tasks support cron syntax or simple interval scheduling with optional offsets.
- Common use cases include downsampling, data aggregation, and triggering external actions.

### Monitoring and Alerting

Monitor time series data and send alerts by creating checks, notification rules, and notification endpoints.

- A check queries data and assigns a status with a `_level` based on specific conditions. Supports threshold checks and deadman checks.
- Notification rules check data in the statuses measurement and, based on conditions set in the notification rule, send a message to a notification endpoint.
- Notification endpoints enable messages to be sent to third-party services like HTTP, Slack, or PagerDuty.
- Status levels include `ok`, `info`, `warn`, and `crit`.

### Dashboard Management

Create and manage dashboards with cells that visualize time-series data.

- Dashboards contain cells with configurable queries and visualization types.
- Dashboards support variables for dynamic filtering.

### Organization and User Management

An organization is a workspace for a group of users, and all dashboards, tasks, buckets, members, etc., belong to an organization.

- An account can contain multiple organizations, which can be used to separate data, environments, teams, providers, and regions.
- Manage organization members and their roles.

### Token and Authorization Management

Create and manage API tokens with fine-grained permissions via the API.

- Tokens can be scoped to specific resources and actions (read/write on buckets, dashboards, tasks, users, etc.).
- You can't change access permissions for an API token after it's created.
- Tokens can be activated or deactivated.

### Secrets Management

All secrets belong to an organization and are stored in InfluxDB Cloud using Vault.

- Secrets can be referenced in Flux scripts to securely access credentials (e.g., third-party API keys).
- Secrets can be added, viewed (keys only), updated, and deleted via the API.

### Labels

Labels are objects that contain labelID, name, description, and color key-value pairs. They may be used for grouping and filtering across one or more kinds of resources.

- Labels can be applied to buckets, tasks, dashboards, and other resources.

### Telegraf Configuration Management

Manage Telegraf agent configurations, which define how Telegraf collects, processes, and outputs data to InfluxDB.

- Store and retrieve Telegraf configuration files associated with your organization.

### DBRP Mappings (v1 Compatibility)

In InfluxDB Cloud, the concepts of database and retention policy have been merged into buckets. DBRP mappings allow v1-compatible tools to map legacy database/retention-policy pairs to buckets.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. InfluxDB Cloud's alerting system (checks, notification rules, and notification endpoints) is designed to send outbound notifications to third-party services (Slack, PagerDuty, HTTP endpoints) when data conditions are met, but it does not provide a webhook or event subscription API for external consumers to receive events about changes within InfluxDB Cloud itself.
