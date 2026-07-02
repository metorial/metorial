# Slates Specification for Better Stack

## Overview

Better Stack is an observability and incident management platform offering uptime monitoring, incident management with on-call scheduling, status pages, log management, metrics, tracing, error tracking, and a serverless ClickHouse-based data warehouse. It provides two main APIs: the Uptime API (for monitors, incidents, on-call, and status pages) and the Telemetry API (for log sources, metrics, dashboards, alerts, and connections).

## Authentication

API requests made to Better Stack are authorized using a Bearer Authentication standard, requiring an `Authorization: Bearer $TOKEN` header on all requests.

Better Stack supports two types of API tokens:

1. **Global API Token**: A global API token is valid across all your teams, for managing anything within Better Stack. Go to Better Stack → API tokens. Copy existing or create new tokens in the Global API tokens section. When using a global token, you must specify a `team_name` parameter on resource-creation requests to indicate which team should own the resource.

2. **Team-scoped API Tokens**: These are scoped to a specific team and come in two flavors:
   - **Uptime API Token**: An Uptime API token is a team-scoped token for managing your Uptime resources. You can get a separate API token for each of your teams.
   - **Telemetry API Token**: A Telemetry API token is a team-scoped token for managing all your Telemetry resources, and resources in Errors and Warehouse.

   Go to Better Stack → API tokens → Team-based tokens. Select your team. Copy existing or create new tokens in the respective API tokens section.

**Base URLs:**

- Uptime API: `https://uptime.betterstack.com/api/v2/` (some endpoints use v3)
- Telemetry API: `https://telemetry.betterstack.com/api/v1/` (some endpoints use v2)

No OAuth2 flow is supported; all authentication is token-based via Bearer headers.

## Features

### Uptime Monitoring

Create and manage monitors that check the availability of your websites, APIs, and services. Supported monitor types include HTTP status code checks, expected status code checks, keyword presence/absence checks, ping, TCP, UDP, SMTP, POP, and IMAP monitors. Monitors can be configured with custom check frequencies, request headers, request bodies, HTTP methods, SSL/domain expiration alerts, maintenance windows, and monitoring regions (US, EU, AS, AU). Monitors can be organized into monitor groups. Playwright-based browser monitors are also supported for synthetic testing scenarios.

### Heartbeat Monitoring

Track CRON jobs and serverless workers and get alerted if they don't run correctly. Heartbeats let you monitor scheduled jobs by expecting periodic pings; if a ping is missed, an incident is created.

### Incident Management

Create, list, acknowledge, resolve, escalate, and delete incidents. List all incidents with the option to filter by monitor, heartbeat, date range, resolution status, and acknowledgment status. Incidents can include metadata for enrichment and filtering. You can also view incident timelines and add comments to incidents.

### On-Call Scheduling

Manage on-call schedules, schedule events, and rotations via the API. Configure escalation policies and escalation policy groups to define how alerts are routed to team members. Severities and severity groups can be configured to categorize incidents.

### Status Pages

Create and manage public status pages to communicate system health to customers. Communicate ongoing incidents, planned maintenance, and service degradations. Host a branded status page on your own custom subdomain. Let your customers subscribe to email updates. You can manage status page resources, sections, and reports through the API.

### Telemetry Sources Management

Create, update, list, and delete log sources through the Telemetry API. Sources define where logs are ingested from, with configurable platforms (e.g., HTTP, Nginx), data regions, log/metrics retention periods, VRL transformations for data processing, and optional custom S3 storage buckets. Sources can be organized into source groups.

### Dashboards

List your team's dashboards, retrieve individual dashboards, and import/export dashboard configurations via the Telemetry API. Dashboards can also be created from pre-built templates.

### Alerts Management

Manage telemetry-based alerts via the API. Threshold alerts notify when a metric crosses a predefined threshold. Relative alerts monitor changes in metrics relative to their historical data. Anomaly detection alerts notify you about any significant deviation from the predicted value of the series. Alerts can be configured with confirmation and recovery periods.

### Metrics

Manage custom metrics through the Telemetry API. Metrics can be ingested via OpenTelemetry, and the API allows managing metric resources.

### Query API (SQL)

Query your logs and metrics outside of the Better Stack dashboard with a read-only HTTP API. You can connect from Grafana, the ClickHouse client via HTTP, or any other HTTP client. This API uses ClickHouse-compatible SQL syntax and requires separate username/password credentials created through the Connections API.

### Incoming Webhooks Management

Configure how incoming webhooks process data to create, update, and resolve incidents. You can define rules for when incidents should be created, acknowledged, or resolved based on JSON payload fields from external systems. This allows third-party tools to trigger Better Stack incidents.

### Integrations Management

Manage integrations with external services (e.g., New Relic, Datadog, Splunk) through the Uptime API, including listing and configuring integration connections.

### Collectors

Manage Better Stack collectors through the Telemetry API, which gather logs, metrics, and traces from your infrastructure using eBPF and OpenTelemetry.

## Events

Better Stack supports outgoing webhooks for the Uptime product. You can choose a webhook type: Incident, Monitor, or On-call contact.

### Incident Events

You will get a POST request when a new incident is created, acknowledged, or resolved. The payload includes incident details and the related monitor information.

### Monitor Events

You will get a POST request when a new monitor is created, updated, paused, unpaused, or deleted.

### On-Call Contact Events

You will get a POST request when an on-call contact changes.

### Status Page Webhook Subscriptions

Webhook subscriptions allow you to receive automated HTTP POST requests whenever there's a status update on the services you're monitoring. Instead of constantly polling for changes, updates are pushed directly to your specified endpoint. Event types include incident, maintenance, or component_update, with status indicators for operational, degraded, downtime, and maintenance states.
