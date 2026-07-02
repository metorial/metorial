Now let me get the full list of API categories from the Datadog API reference page to understand the complete feature set.Now I have comprehensive information to write the specification.

# Slates Specification for Datadog

## Overview

Datadog is a cloud-based monitoring and observability platform for infrastructure, applications, logs, and security. It provides APIs for submitting and querying metrics, managing monitors and dashboards, handling incidents, and configuring integrations across cloud environments. The platform supports over 1,000 built-in integrations and serves as a unified observability solution.

## Authentication

Datadog supports two primary authentication methods:

### 1. API Key + Application Key

All requests to Datadog's API must be authenticated. Requests that write data require reporting access and require an API key. Requests that read data require full access and also require an application key.

- **API Key**: Passed via the `DD-API-KEY` HTTP header. Identifies your Datadog organization. Created under Organization Settings > API Keys.
- **Application Key**: Passed via the `DD-APPLICATION-KEY` HTTP header. Application keys, in conjunction with your organization's API key, give users access to Datadog's programmatic API. Application keys are associated with the user account that created them and by default have the permissions of the user who created them.
- You can specify authorization scopes for your application keys to define more granular permissions and minimize the access that applications have to your Datadog data.

**Datadog Site**: The API base URL depends on your Datadog site/region. Common sites include:

- `https://api.datadoghq.com` (US1)
- `https://api.us3.datadoghq.com` (US3)
- `https://api.us5.datadoghq.com` (US5)
- `https://api.datadoghq.eu` (EU)
- `https://api.ap1.datadoghq.com` (AP1)
- `https://api.ddog-gov.com` (US1-FED/GovCloud)

You must use the correct site URL matching your Datadog account region.

### 2. OAuth2 (Authorization Code Grant with PKCE)

Datadog uses the OAuth 2.0 (OAuth2) Authorization Framework to allow users to securely authorize third-party applications' access to restricted Datadog resources on behalf of the user. The access that applications have is determined by scopes, which enable users to grant explicit consent for a specific set of granular permissions requested by the application.

- **Grant Type**: Authorization Code with PKCE (recommended)
- **Authorization Endpoint**: `https://app.datadoghq.com/oauth2/v1/authorize` (varies by site)
- **Token Endpoint**: `https://api.<domain>/oauth2/v1/token`
- **Revocation Endpoint**: `https://api.<domain>/oauth2/v1/revoke`
- Datadog access tokens are short-lived tokens with a time-to-live (TTL) of 1 hour that grant access to Datadog APIs. Refresh tokens for Marketplace OAuth clients are long-lived tokens with no expiration that are used to automatically obtain a new access token each time it expires.
- Use the access_token to make calls to Datadog API endpoints by sending it as a part of the authorization header: `Authorization: Bearer {access_token}`.
- Scopes are granular (e.g., `dashboards_read`, `monitors_write`, `metrics_read`, `logs_read`, `incidents_write`, `api_keys_write`, etc.).

## Features

### Metrics Management

Submit custom metrics, query timeseries data, and manage metric metadata and tag configurations. The Metrics API allows submitting and querying metrics data, enabling you to send custom metrics or retrieve historical metric values. These endpoints are central to monitoring application and infrastructure performance. Supports count, gauge, rate, and distribution metric types.

### Monitors and Alerting

The Monitors API allows programmatic creation and management of monitoring alerts, including configuration of notification settings and downtime scheduling. Monitors can be based on metrics, logs, traces, synthetic tests, and more. Supports grouping, thresholds, notification channels, and muting/downtime scheduling.

### Dashboards

The Dashboards API is for building, modifying, and retrieving visualization dashboards, enabling automated dashboard creation based on templates or application needs. Supports creating, sharing, and managing dashboard lists. Dashboards can include widgets querying metrics, logs, traces, events, and other data sources.

### Log Management

The Logs API provides endpoints for sending logs directly to Datadog, configuring log processing pipelines, and managing log archives. Includes searching/filtering logs, managing indexes, retention filters, log-based metrics, and custom log forwarding destinations.

### Events

The Events API is used to post and retrieve events from the Datadog event stream. Events can represent deployments, alerts, or any significant occurrences in your environment.

### Incident Management

Create, update, and manage incidents including response teams, timelines, todos, integration metadata, notification rules, and postmortems. Supports incident types, attachments, and global incident settings.

### Service Level Objectives (SLOs)

The SLOs API allows creating and tracking SLOs to measure service reliability. Supports monitor-based, metric-based, and time-slice SLOs, as well as SLO corrections and reporting.

### Synthetic Monitoring

The Synthetics API allows managing synthetic tests, retrieving test results, and scheduling test runs. Supports API tests (HTTP, SSL, DNS, WebSocket, TCP, UDP, ICMP, gRPC), browser tests, mobile app tests, and network path tests. Includes global variables and private locations management.

### APM and Tracing

Query spans and traces, manage APM retention filters, and access service-level data. Supports distributed tracing across services and searching/aggregating span data.

### Users, Roles, and Organizations

The Users & Organizations API enables management of team members, permissions, and organization settings. Includes role-based access control, teams, service accounts, SCIM provisioning, and AuthN mappings.

### Security Monitoring

Manage detection rules, security signals, suppression rules, and security findings. Covers Cloud SIEM, Cloud Security Management (misconfigurations, vulnerabilities), and Application Security.

### Cloud Integrations

Configure and manage integrations with AWS, Azure, GCP, Cloudflare, Confluent Cloud, Fastly, Okta, PagerDuty, Opsgenie, Slack, Microsoft Teams, Jira, and ServiceNow.

### On-Call and Paging

Create and manage on-call schedules, escalation policies, routing rules, and pages. Supports acknowledge, escalate, and resolve actions on pages.

### Workflow Automation

Create, update, execute, and manage automated workflows. Supports workflow instances, triggers, and integration with other Datadog features.

### Software Catalog and Service Definitions

Manage service definitions, entity relations, scorecards, and entity kinds for tracking service ownership and metadata.

### Case Management

Create and manage cases for tracking issues, with support for projects, custom attributes, assignments, notifications, and status tracking.

### Notebooks

Create and manage collaborative notebooks for investigations, documentation, and sharing analysis with teams.

### Reference Tables

Create and manage lookup tables for enriching monitoring data with business context.

### DORA Metrics

Submit deployment and failure events to track DORA (DevOps Research and Assessment) metrics for software delivery performance.

### Usage Metering and Cost Management

Retrieve usage data, cost attribution, billing information, and cloud cost management configurations across your account.

## Events

Datadog supports outbound webhooks that can be triggered from monitors and other alerting mechanisms to notify external services.

### Monitor Alert Webhooks

Alert your services when a metric alert is triggered. Go to the Webhooks integration tile and enter the URL and name of the webhook you want to use. To use your webhook, add @webhook-<WEBHOOK_NAME> in the text of the metric alert you want to trigger the webhook. Webhooks fire an HTTP POST with a JSON payload containing alert details such as event title, alert status, alert transition, tags, hostname, metric name, priority, and more.

- Can be configured with custom payloads, custom headers, and encoding (JSON or form).
- Triggered by monitor state changes (alert, warning, recovery, no data, etc.).
- Supports template variables in payloads (e.g., `$EVENT_TITLE`, `$ALERT_STATUS`, `$ALERT_TRANSITION`, `$HOSTNAME`, `$TAGS`, `$LINK`).

### Incident Webhooks

Webhooks can also be triggered for incident lifecycle events, providing payload data including incident attachments, commander info, customer impact details, severity, fields, and integration metadata.

Note: Datadog's webhooks are primarily an **outbound** mechanism — Datadog sends notifications to your endpoints when configured events occur. There is no general-purpose inbound webhook subscription API for listening to arbitrary platform events. The webhook integration is configured through the Datadog UI or Webhooks Integration API, and is tied to monitor notifications and incident updates.
