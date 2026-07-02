# Slates Specification for Grafana

## Overview

Grafana is an open-source observability and data visualization platform that allows users to query, visualize, and alert on metrics, logs, and traces from various data sources. Every Grafana instance exposes an HTTP API used to manage resources like saving dashboards, creating users, updating data sources, deleting alerts, and more. Grafana is available as a self-hosted instance or as Grafana Cloud, a managed SaaS offering.

## Authentication

Grafana supports two distinct API surfaces with different authentication mechanisms:

### Grafana Instance HTTP API (self-hosted or Grafana Cloud stack)

Used to manage instance-level resources such as dashboards, users, data sources, and alerts.

1. **Service Account Tokens (recommended):** API keys are deprecated. Service accounts now replace API keys for authenticating with the HTTP APIs and interacting with Grafana. All organization actions can be accessed through a Service Account token. A Service Account token is associated with an organization. It can be used to create dashboards and other components specific for that organization.
   - Create a service account under **Administration > Users and access > Service Accounts**.
   - Assign a role (Admin, Editor, or Viewer) to the service account.
   - Generate a token for the service account.
   - Pass the token in the `Authorization` header: `Authorization: Bearer <SERVICE_ACCOUNT_TOKEN>`.
   - X-Grafana-Org-Id is an optional property that specifies the organization to which the action is applied. If it is not set, the created key belongs to the current context org. Use this header in all requests except those regarding admin.

2. **Basic Authentication:** You can authenticate HTTP API requests using basic authentication or a service account token. If basic auth is enabled (it is enabled by default), then you can authenticate your HTTP request via standard basic auth. This method uses a username and password. You can't authenticate to the Admin HTTP API with service account tokens. Service accounts are limited to an organization and an organization role. They can't be granted Grafana server administrator permissions. To use these API endpoints you have to use Basic authentication and the Grafana user must have the Grafana server administrator permission.

   The base URL for API calls is your Grafana instance URL, e.g., `https://your-grafana-instance.com/api/`.

### Grafana Cloud API (GCOM API)

Used to manage cloud-level resources such as stacks, access policies, and cloud organization settings.

You must create a Cloud Access Policy and token to use the Cloud API. To create a Grafana Cloud Access Policy, refer to Create an access policy.

- **Cloud Access Policy Tokens:** An individual access policy is composed of one or more scopes and a realm. The scope is a specific action on a specific service. For example, the metrics:read scope defines an action that reads data from the Mimir service. The logs:write scope defines an action that creates data in the Loki service.
- Scopes include: `metrics:read`, `metrics:write`, `logs:read`, `logs:write`, `traces:read`, `traces:write`, `alerts:read`, `rules:read`, `profiles:read`, `stack:read`, `frontend-observability:read`, `frontend-observability:write`, and others.
- A realm has a type, such as organization or stack, an identifier, and a list of label policies. A realm must be specified when using the API or the Access Policies page in the Cloud Portal, but the realm is automatically set when managing access policies in the Grafana Administration settings. You can specify an organization or stack ID.
- Pass the token in the `Authorization` header: `Authorization: Bearer <CLOUD_ACCESS_POLICY_TOKEN>`.
- The base URL for cloud API calls is `https://grafana.com/api/`.

## Features

### Dashboard Management

Create, update, retrieve, list, search, and delete dashboards programmatically. Every Grafana instance exposes an HTTP API, which is the same API used by the Grafana frontend to manage resources like saving dashboards, creating users, updating data sources, deleting alerts, and more. You can use the HTTP API to programmatically access or manage resources from your Grafana instance running in Grafana Cloud. Dashboards include version history and can be assigned to folders. Dashboard permissions can be managed to control access at the dashboard level.

### Folder Management

Create, update, list, and delete folders for organizing dashboards. Supports nested folders. Folder-level permissions can be configured to control which users and teams can access the contents.

### Data Source Management

Configure and manage connections to data sources (e.g., Prometheus, Loki, Tempo, SQL databases, etc.). Data sources can be created, updated, listed, and deleted. Supports proxied queries through the data source.

### Alerting

Define and manage alert rules, notification policies, contact points, silences, and muting rules. Alerts can be configured to trigger notifications to various channels (Slack, email, PagerDuty, webhooks, etc.) when conditions are met.

### Annotations

Annotations are saved in the Grafana database. Annotations can be organization annotations that can be shown on any dashboard by configuring an annotation data source - they are filtered by tags. Or they can be tied to a panel on a dashboard and are then only shown on that panel. Create, query, update, and delete annotations. Useful for marking events like deployments on graphs.

### User and Team Management

Create and manage users, teams, and their permissions. Assign users to organizations and teams. Manage organization-level preferences and settings.

### Organization Management

Create and manage organizations (multi-tenant support). Switch organizational context for users. Manage organization members and their roles.

### Service Account Management

Create and manage service accounts and their tokens for API authentication. Assign roles and permissions to service accounts.

### Playlists

If you want to display your Grafana dashboards on a TV monitor, you can use the playlist feature to pick the dashboards that you or your team need to look at through the course of the day and have them cycle through on the screen. Create, update, list, and delete playlists that cycle through selected dashboards.

### Snapshots

Create and share dashboard snapshots — point-in-time captures of dashboard data that can be shared externally without requiring Grafana access.

### Library Elements

Manage reusable panel and variable elements that can be shared across multiple dashboards.

### Correlations

Define correlations between data sources to enable contextual navigation between related data (e.g., jumping from a metric to related logs).

### Cloud Stack Management (Grafana Cloud only)

Manage Grafana Cloud stacks, including creating and deleting stacks, managing plugins on stacks, and configuring access policies and tokens.

### Role-Based Access Control (Enterprise/Cloud)

Define custom roles with fine-grained permissions. Assign roles to users and teams for granular access control over dashboards, folders, data sources, and other resources.

## Events

Grafana supports outgoing webhooks for alert notifications and incident/on-call event subscriptions.

### Alert Notification Webhooks

Use the webhook integration in contact points to send alert notifications to your webhook. The webhook integration is a flexible way to integrate alerts into your system. When a notification is triggered, it sends a JSON request with alert details and additional data to the webhook endpoint. Configure a webhook as a contact point so that alert rule state changes (firing, resolved) send a JSON payload to a specified URL.

- Supports HTTP Basic Authentication or custom Authorization headers.
- You can secure your webhook notifications using HMAC signatures to verify the authenticity and integrity of the requests. When enabled, Grafana signs the webhook payload with a shared secret using HMAC-SHA256.

### Grafana OnCall / IRM Outgoing Webhooks

Outgoing webhooks are used by Grafana OnCall to send data to a URL in a flexible way. These webhooks can be triggered from a variety of event types and make use of Jinja2 to transform data into the format required at the destination URL. Available event trigger types include:

- **Alert group created** — when a new alert group is created.
- **Acknowledged** — when an alert group is acknowledged.
- **Resolved** — when an alert group is resolved.
- **Silenced / Unsilenced** — when an alert group is silenced or the silence expires.
- **Unresolved / Unacknowledged** — when an alert group is unresolved or unacknowledged.
- **Status change** — This event will trigger when any of the status change actions happen (acknowledge, resolve, silence, unacknowledge, unresolve, or unsilence).
- **Escalation** — when the webhook is included as a step in an escalation chain.

Webhooks support Jinja2 templates for customizing request URL, headers, and body. They can be filtered to trigger only for specific integrations.

### Grafana Incident Outgoing Webhooks

Outgoing webhooks can be configured to fire when specific events occur. For example, you can trigger workflows in other systems when an incident is declared in Grafana Incident. Events include incident declaration, status changes, severity changes, and label additions. Supports custom URL targets and event payload customization.
