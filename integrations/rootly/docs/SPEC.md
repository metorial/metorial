Now let me get more details on the API key scopes and the full API features:Now let me look at the API reference to understand the full feature set:Now I have comprehensive information to write the specification.

# Slates Specification for Rootly

## Overview

Rootly is an incident management platform for engineering teams that provides on-call scheduling, incident response orchestration, retrospectives, status pages, and workflow automation. It integrates deeply with Slack and Microsoft Teams and connects to monitoring, ticketing, and communication tools to manage the full incident lifecycle.

## Authentication

Rootly uses API key-based authentication via Bearer tokens over HTTPS.

**Generating an API Key:**
Navigate to: Organization dropdown > Organization Settings > API Keys > Generate New API Key.

**Authentication Header:**
Include the API key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR-TOKEN
Content-Type: application/vnd.api+json
```

**API Base URL:** `https://api.rootly.com/v1/`

**API Key Types (Scopes):**

Rootly supports three types of API keys:

| Type                 | Description                                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global API Key**   | Full access to all entities across your Rootly instance. Required for organization-wide visibility across teams, schedules, and incidents. These keys are assigned On-Call and Incident Response roles at generation time, and the role's permissions control the key's access. |
| **Team API Key**     | Team Admin permissions with full read/edit access to entities owned by that team. Suitable for team-specific workflows. Scoped to resources like schedules and escalation policies owned by the specific team.                                                                  |
| **Personal API Key** | Inherits the permissions of the user who created it. Works for individual use cases but may have limited visibility.                                                                                                                                                            |

API keys follow the pattern `rootly_` followed by a 64-character hex string (e.g., `rootly_abc123...`).

**Role-Based Permissions:** Global API Keys can be configured with custom permission sets (roles) that control read/write access to specific resource types (e.g., Teams, Schedules, Incidents, Secrets). These roles are assigned at key creation time. If you edit a Rootly role used on an API key, the existing key will not receive changes to the role permissions. You must generate a new API key.

## Features

### Incident Management

Create, update, and manage incidents through their full lifecycle. Incidents can be triaged, mitigated, resolved, cancelled, restarted, or marked as duplicates. Users can be assigned to incidents with specific roles, and subscribers can be added or removed. Alerts are incoming signals from monitoring tools. Incidents are the structured record Rootly creates to track and manage an issue. Multiple alerts can attach to the same incident.

- Supports incident types, severities, sub-statuses, and custom form field selections.
- Incidents can be linked to services, environments, functionalities, and teams.

### Alerts and Alert Routing

Ingest alerts from monitoring and observability tools, manage alert sources, and configure routing rules. Alerts can be created, acknowledged, resolved, and grouped. You can connect sources like Datadog, Grafana, Sentry, cloud provider alerts, or any system capable of sending webhooks. Once connected, alerts flow into Rootly and can create incidents automatically based on your rules.

- Configure alert sources, alert fields, urgencies, and routing rules.
- Alerts can be attached to incidents.

### On-Call Scheduling

Rootly On-Call is the decision engine that determines who should respond, how urgently, and through which channels when something requires immediate attention. It brings together schedules, escalation policies, notification rules, live call routing, and health checks.

- Manage schedules, schedule rotations, rotation users, active days, and override shifts.
- Configure on-call roles and shadow assignments for training purposes.
- Query current on-call status and shifts.

### Escalation Policies and Paths

Define how alerts escalate when responders don't acknowledge. Supports multi-level escalation with configurable targets (users, schedules, channels) and conditions based on alert urgency or content. Escalation paths allow dynamic routing based on business hours or alert properties.

### Workflows and Automation

Create automated workflows triggered by incident or alert events. Workflows consist of configurable tasks and can be conditioned on incident properties (severity, type, services). Workflow runs can be listed and created. Supports workflow groups for organization and form field conditions for dynamic behavior.

### Retrospectives

Manage post-incident retrospectives including templates, processes, process groups, and steps. Retrospective configurations control how the review process is structured. Incident-level retrospective data can be retrieved and updated.

### Action Items

Track follow-up tasks from incidents. Action items can be created, updated, and listed per incident or across the entire organization.

### Service Catalog

Manage a catalog of services, functionalities, and environments with custom properties. Services and functionalities support incident and uptime chart data. The catalog also supports generic catalog entities and custom properties for extended metadata.

### Teams and Users

Manage teams, users, user email addresses, phone numbers, and notification rules. Users can be assigned roles, and teams can own resources like schedules and escalation policies.

### Dashboards and Metrics

Create and manage custom dashboards with panels. Panels can display incident data using various chart types, filtered and grouped by properties like severity, status, or service.

### Status Pages

Create and manage public or internal status pages with templates. Status page events can be linked to incidents to communicate outage information externally.

### Playbooks

Define reusable incident response playbooks with ordered tasks that guide responders through standardized procedures.

### Communications

Manage stakeholder communication templates, types, stages, and groups for structured incident communications.

### Heartbeats

Monitor system health by sending periodic heartbeat pings. If a heartbeat is missed, it can trigger alerts or incidents.

### Live Call Routing

Configure phone-based live call routers that allow callers to reach on-call responders via phone, with support for custom greetings and automated routing.

### Audit Logs

Retrieve audit logs for compliance and tracking purposes.

### Webhooks Management

Programmatically manage outbound webhook endpoints and review webhook delivery history, including retrying failed deliveries.

## Events

Rootly supports webhooks to receive real-time event notifications from Rootly for incidents, alerts, and other system events in external applications. Webhook endpoints can be configured via the API or the Rootly UI (Configuration > Webhooks).

The event object holds the event, and the data property holds a representation of the resource at the time the event was issued. Each request includes a `X-Rootly-Signature` header for verifying authenticity using HMAC SHA256 with a shared secret.

### Incident Events

Notifications for incident lifecycle changes:

- `incident.created`, `incident.updated`, `incident.mitigated`, `incident.resolved`, `incident.cancelled`, `incident.deleted`

### Scheduled Incident Events

Notifications for scheduled maintenance incidents:

- `incident.scheduled.created`, `incident.scheduled.updated`, `incident.scheduled.in_progress`, `incident.scheduled.completed`, `incident.scheduled.deleted`

### Retrospective Events

Notifications for post-mortem/retrospective lifecycle changes:

- `incident_post_mortem.created`, `incident_post_mortem.updated`, `incident_post_mortem.published`, `incident_post_mortem.deleted`

### Alert Events

Notifications when new alerts are ingested:

- `alert.created`

### Pulse Events

Notifications for status update pulses:

- `pulse.created`
