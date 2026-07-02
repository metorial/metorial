Now let me look at the webhook event types more closely and check for API key roles/scopes:# Slates Specification for incident.io

## Overview

incident.io is an incident management, on-call scheduling, and status pages platform. It provides tools for declaring and managing incidents, configuring alert routing and escalation paths, maintaining a service catalog, and publishing status pages. The API allows programmatic access to create and manage incidents, alerts, schedules, workflows, and related configuration.

## Authentication

The API is hosted at `https://api.incident.io/`, and you will need an API key from your incident.io dashboard to make requests. For all requests, you'll need an API key. To create one, visit **Settings > API keys**.

When you create the key, you'll choose what actions it can take — these roles can only be set at creation time. The token is only shown once, so store it somewhere safe. API keys are global to your account and remain valid even if the creating user is deactivated.

**Method:** API Key (Bearer Token)

Set the `Authorization` header on every request:

```
Authorization: Bearer <YOUR_API_KEY>
```

**Permissions / Scopes:**

API keys can have either global permissions, team-scoped permissions, or a combination of the two. Users can create keys with the permissions that they, themselves have. API keys can have different scopes — make sure to grant the required permissions when creating the key. Permissions are selected at key creation time and cannot be changed afterwards. The available permission scopes correspond to the actions the key can perform (e.g., managing incidents, viewing private incidents, managing on-call schedules, managing catalog entries, etc.).

## Features

### Incident Management

Create, list, view, and edit incidents. Incidents have properties such as name, summary, severity, status, visibility (public or private), type, custom fields, and assigned roles (e.g., incident lead). You can also manage incident attachments, relationships between incidents, and incident update entries.

- Incidents can be public or private; private incidents restrict data visibility in API responses and webhooks.
- Custom fields and incident types can be configured and assigned to incidents.

### Alerts and Alert Routing

Ingest alert events via HTTP sources, manage alert sources and alert attributes, and configure alert routes that determine how alerts are escalated or grouped into incidents.

- Alert sources accept events from external monitoring tools via HTTP endpoints.
- Alert routes define rules for how incoming alerts are processed, escalated, or grouped.
- Alert attributes allow defining custom metadata schemas for alerts.

### Escalations and On-Call Schedules

Create and manage escalation paths that define how and to whom alerts are escalated. Manage on-call schedules with rotations and overrides.

- Escalation paths define multi-step escalation policies.
- Schedules support creating overrides and listing schedule entries for a given time range.

### Catalog

Maintain a service catalog of types and entries (e.g., services, teams, environments). Catalog types define schemas, and entries represent individual items within those types.

- Supports bulk updating of catalog entries.
- Catalog entries can be referenced by incidents and alerts for context.

### Severities and Statuses

Define and manage custom severity levels and incident statuses to match your organization's incident lifecycle.

### Incident Roles

Define custom incident roles (e.g., Incident Lead, Communications Lead) that can be assigned to users during an incident.

### Follow-Ups / Actions

Track post-incident follow-up items (also known as actions). Follow-ups can be listed and viewed, with support for priority levels.

### Incident Timestamps

Define and manage custom timestamp milestones for incidents (e.g., time to detection, time to resolution).

### Status Pages

Manage public-facing status pages including status page incidents, maintenance windows, and updates. View status page structure and component hierarchy.

### Workflows

Create and manage automated workflows that trigger actions based on incident events and conditions (e.g., sending notifications, updating statuses, calling external webhooks).

### Users

List and view users in the organization.

### IP Allowlists

View and update IP allowlist configuration for restricting API access.

### Utilities

Verify API key identity and access the OpenAPI specification.

## Events

Webhooks can be used to receive notifications when certain events occur in incident.io. This might be useful for annotating graphs in a monitoring tool with incidents, or keeping track of follow-ups in another system. Webhooks are powered by Svix.

Webhook endpoints are configured in **Settings > Webhooks**, where you can choose which event types to receive, send test events, view recent deliveries, and retry failed events.

Webhooks are signed with a signing secret for verification, included in headers on each delivery.

Private incidents are the exception to full payloads — for private incidents, only the resource ID is sent. If your integration needs full data, you'll need an API key that can view private incidents.

### Incident Events

Notifications when public or private incidents are created or updated. Includes a specific event for incident status changes on public incidents.

### Follow-Up / Action Events

Notifications when follow-ups (actions) are created or updated, for both public and private incidents.

### Alert Events

Notifications when new alerts are created, for both public and private incidents.

### Incident Membership Events

Notifications when a user is granted or revoked access to a private incident.
