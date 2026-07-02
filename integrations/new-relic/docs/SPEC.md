# Slates Specification for New Relic

## Overview

New Relic is an observability platform that provides application performance monitoring (APM), infrastructure monitoring, log management, browser monitoring, synthetic monitoring, and alerting. It offers two primary APIs: NerdGraph (a GraphQL API for querying data and configuring features) and a REST API (v2) for retrieving metric data and managing resources. Data can be ingested via dedicated HTTP ingest APIs for metrics, events, logs, and traces.

## Authentication

New Relic uses API key-based authentication. There are several key types, each serving different purposes:

### User Key (Personal API Key)

- The primary keys are the license key (for reporting data) and the user key (for working with NerdGraph, our GraphQL API).
- User keys, sometimes referred to as "personal API keys," are required for using NerdGraph and the REST API. A user key is tied to a specific New Relic user, and cannot be transferred.
- The user key allows you to make queries for any accounts you've been granted access to, not just the specific account the key was associated with.
- Passed via the `API-Key` header for NerdGraph or `Api-Key` header for the REST API.
- NerdGraph endpoint (US): `https://api.newrelic.com/graphql`
- NerdGraph endpoint (EU): `https://api.eu.newrelic.com/graphql`
- REST API base URL (US): `https://api.newrelic.com/v2/`
- REST API base URL (EU): `https://api.eu.newrelic.com/v2/`

### License Key (Ingest Key)

- The license key is required for almost all New Relic data ingest. The exceptions are browser monitoring data (which uses a browser key) and mobile monitoring data (which uses a mobile app token). The license key is a 40-character hexadecimal string associated with a New Relic account.
- Used for sending data to the Metric API, Event API, Log API, and Trace API.
- Passed via `Api-Key` or `License-Key` HTTP header on ingest endpoints.

### Browser Key

- Used specifically for ingesting browser monitoring data. Categorized as an ingest key alongside the license key.

### Key Management

- You can manage most API keys from the API Keys UI page located in the user menu when you click API keys.
- Keys can also be created, rotated, and managed programmatically via NerdGraph.

For most integration use cases (querying data, managing alerts, dashboards, etc.), a **User Key** is the required credential. For data ingestion, a **License Key** is needed. The **Account ID** is also required for many operations and must be provided alongside the key.

## Features

### Data Querying (NRQL)

Run NRQL (New Relic Query Language) queries against all telemetry data stored in New Relic, including metrics, events, logs, and traces. You can use NRQL, New Relic's query language, inside a NerdGraph request for customized results. Queries can be run synchronously or asynchronously. NRQL is SQL-like and supports filtering, aggregation, faceting, and time-series analysis.

### Entity Management

Entities at New Relic refer to anything monitored that generates or contains telemetry. Entities help you find the data you want to track, and if you understand their relationships with other entities, you can get even more insights. Through the API you can search, query, and tag entities such as applications, hosts, services, and cloud integrations. Entities are identified by GUIDs.

### Alerts and Alert Conditions

NerdGraph allows you to interact programmatically with New Relic's platform, giving you full control over your alerting configuration. You can create, manage, and monitor alert conditions, policies, and notification channels. Alert conditions can be based on NRQL queries, with support for static thresholds and baseline (anomaly) detection. Policies group conditions and define incident preferences (per condition, per policy, or per condition and target).

### Dashboards

You can use the NerdGraph API to create and manage dashboards. This API allows you to create, read, update, and delete dashboards (CRUD). Dashboards consist of pages containing widgets (charts, tables, billboards, markdown, etc.), each driven by NRQL queries. Cross-account dashboards are supported.

### Synthetic Monitoring

Manage synthetic monitors programmatically, including creating, updating, and deleting monitors. Synthetics simulate user interactions or API calls to proactively detect issues. You can manage synthetics monitor downtime configurations using NerdGraph API.

### Data Ingestion

NerdGraph isn't used for data ingest. For that, you'd use the data ingest APIs. Separate HTTP APIs exist for ingesting:

- **Metrics** (via Metric API) — send custom metric data points.
- **Events** (via Event API) — send custom event data.
- **Logs** (via Log API) — send log messages.
- **Traces** (via Trace API) — send distributed tracing spans.

All ingest APIs authenticate with the license key.

### Change Tracking

The change tracking feature allows you to track the effect of various changes on your customers and systems. For example, if you make some deployments, you can use the change tracking feature to monitor the results in New Relic UI charts. Deployment markers and other change events can be created via NerdGraph mutations.

### Account and User Management

NerdGraph supports managing accounts, users, user groups, roles, and API keys. This includes creating and managing user groups, assigning roles, and provisioning users. SCIM is also supported for automated user provisioning from identity providers.

### Workloads and Tags

You can do things like add tags, configure workloads, or customize "golden metrics." Tags can be added to any entity for organization and filtering. Workloads let you group related entities for unified monitoring views.

### Notification Workflows

Configure workflows that determine when and where alert notifications are sent. Supported destinations include webhooks, Slack, PagerDuty, ServiceNow, Jira, email, and Microsoft Teams. Notifications can be enriched with additional New Relic data.

## Events

New Relic supports outbound webhooks for alert-related events. These are configured as notification destinations within the Workflows feature.

### Alert Issue Notifications

With workflows you control when and where you want to receive notifications about issues. Issues are groups of alert events that describe the underlying problem of your symptoms. When a new alert event is created, incident intelligence opens an issue and evaluates other open issues for correlations.

Webhook notifications can be triggered on the following issue lifecycle events:

- **Activated** — when a new issue is opened.
- **Acknowledged** — when an issue is acknowledged.
- **Closed** — when an issue is resolved.
- **Priority changed** — when an issue's priority changes.

Configurable options include:

- Filtering which issues trigger a workflow (by tags, condition name, priority, entity type, etc.).
- Customizing the JSON payload sent to the webhook endpoint.
- Enriching the notification with additional NRQL query results.

### Deployment Notifications

After you record a deployment for an APM application entity, you can keep your team informed about those changes through the use of a webhook. These are available whether you record your deployment using the change tracking feature or the older REST API. You can send deployment data to a variety of webhook destinations.
