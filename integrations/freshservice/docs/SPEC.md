Now let me get more details on the API features by looking at the official API documentation.Now I have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Freshservice

## Overview

Freshservice is a cloud-based IT Service Management (ITSM) platform by Freshworks that enables IT teams to manage service delivery, incidents, problems, changes, assets, and projects. It also supports non-IT business teams through its Enterprise Service Management (ESM) offering and Managed Service Providers (MSPs). The platform provides a RESTful JSON API (v2) at `https://<subdomain>.freshservice.com/api/v2/`.

## Authentication

Freshservice supports two authentication methods:

### 1. API Key Authentication (Primary Method)

The primary authentication method is API Key authentication. You generate an API key from your Freshservice profile, then include it in your requests using Basic Auth.

- **How to obtain**: Log in to your Freshservice portal → Click your profile picture → Go to Profile Settings → Find your API key below the Change Password section.
- **How to use**: Use HTTP Basic Authentication with your API key as the username and any placeholder character (e.g., `X`) as the password.
  - Example: `curl -u YOUR_API_KEY:X -H "Content-Type: application/json" https://<subdomain>.freshservice.com/api/v2/tickets`
  - Alternatively, Base64-encode `YOUR_API_KEY:X` and pass it as an `Authorization: Basic <encoded_value>` header.
- **Required input**: Your Freshservice subdomain (the part before `.freshservice.com` in your portal URL) and your personal API key.

### 2. OAuth 2.0 (Authorization Code Flow)

Freshservice APIs support OAuth authentication. Freshservice supports accessing its resources via API with OAuth mechanism for authentication and authorisation.

- **Setup**: Register an OAuth app via the Freshworks Developer Portal to obtain a Client ID and Client Secret.
- **Authorization endpoint**: `https://<org_domain>.myfreshworks.com/org/oauth/v2/authorize`
- **Token endpoint**: `https://<org_domain>.myfreshworks.com/org/oauth/v2/token`
- **Flow**: Standard Authorization Code grant. Redirect user to the authorization URL with `client_id`, `redirect_uri`, `scope`, `state`, and `response_type=code`. Exchange the received code for an access token.
- **Token usage**: Pass the access token as `Authorization: Bearer <access_token>` header.
- The access token has a lifetime of 30 minutes. At a regular interval, your app should send a refresh-access-token call to the authorization server and regenerate the access token. The refresh token has a lifetime of 365 days.
- **Scopes**: Scopes are granular and module-specific, following the pattern `freshservice.<module>.<action>`. Examples include `freshservice.tickets.create`, `freshservice.tickets.view`, `freshservice.assets.manage`, `freshservice.changes.edit`, `freshservice.problems.delete`, etc. Each API endpoint documents its required scope.
- **Required inputs**: Freshworks organization domain (e.g., `samplecompany.myfreshworks.com`), Client ID, Client Secret.

> **Note**: Username and password-based basic authentication of Freshservice APIs is no longer supported. Instead use basic auth with API Key authentication.

## Features

### Ticket & Service Request Management

Create, view, update, filter, delete, and restore tickets (incidents and service requests). Supports child tickets, ticket conversations (replies and notes), time entries, tasks, CSAT responses, approvals with multi-level approval groups and chains, and service catalog requests. Tickets can be moved between workspaces and linked to assets, problems, and changes.

- Tickets can be filtered using a query language with logical operators on fields like priority, status, agent, group, custom fields, and dates.
- Major incident management is supported, including promoting/demoting incidents and collaboration via email and Zoom.

### Problem Management

Create, view, update, and delete problems with associated notes, time entries, tasks, and analysis fields (cause, symptom, impact). Problems can be linked to changes and assets.

### Change Management

Full lifecycle management of changes including creation, updates, approvals (with approval groups and chain rules), notes, time entries, and tasks. Changes support associations with maintenance windows, blackout windows, and impacted services. Filtering is supported via a query language or predefined views.

### Release Management

Manage releases with full CRUD, notes, time entries, tasks, and associations with changes and assets. Supports filtering by predefined views.

### Asset Management

Complete asset lifecycle management including creation, updates, search, filtering, components, relationships, software tracking, installations, user assignments, and contract associations. Supports moving assets between workspaces and permanent deletion.

- Assets can be searched by name, serial number, MAC address, IP, UUID, or IMEI.
- Relationships between assets, users, departments, and software can be managed in bulk.

### User & Group Management

Manage agents (full-time and occasional), requesters/contacts, agent groups (including restricted groups with approvals), requester groups, and roles. Supports converting between agent and requester types, merging requesters, and filtering users via a query language.

- For MSP accounts, contacts are specific to each client workspace.

### Service Catalog

Manage service categories, service items (with custom fields, shared fields, visibility controls), and place service requests through the catalog. Supports searching service items and managing shared fields across workspaces.

### Knowledge Base (Solutions)

Manage solution categories, folders (with visibility and approval settings), and articles. Supports multilingual articles, articles from external URLs, attachments, article approvals, publishing workflows, and search.

### Project Management

Create and manage projects, project tasks (with sprints, versions, story points), task dependencies, and associations with tickets, problems, changes, and assets. Supports both legacy and new-gen project management APIs with custom fields, task filtering, and notes with attachments.

### Employee Lifecycle

Manage employee onboarding and offboarding requests with configurable form fields, lookup fields, and automated kit/ticket generation. Also supports Journeys—configurable multi-phase lifecycle workflows (onboarding, offboarding, crossboarding, parental leave) with tasks, service requests, and email activities.

### On-Call Management

Create and manage on-call schedules, shifts with primary/secondary/tertiary rosters, overrides, escalation policies (with conditions, notification channels, and repeat settings), and calendar event exports (including webcal and iCal).

### Alert Management

View, filter, acknowledge, resolve, suppress, and delete IT infrastructure alerts. Supports alert notes and logs. Alerts can be filtered using a query language with conditions on severity, state, workspace, tags, and timestamps.

### Contracts & Purchase Orders

Manage contracts (lease, maintenance, software license) with approval workflows, associated assets, and attachments. Manage purchase orders with line items. Both support movement between workspaces.

### Organizational Configuration

Manage departments, locations, vendors, products, asset types, business hours, SLA policies, canned responses, announcements, workspaces/clients, and custom objects (with records). Supports audit log exports for admin changes.

### Status Page

Manage public-facing status pages with service components, incidents, incident updates, scheduled maintenances (from changes or maintenance windows), maintenance updates, and subscriber management. Supports custom incident and maintenance statuses.

### Approvals & Delegations

Cross-module approval management for tickets, changes, and contracts. Supports delegation of responsibilities to other users for specified periods.

### Custom Objects

Create custom data entities with records that can be queried, created, updated, and deleted. Useful for extending Freshservice's data model for custom workflows.

## Events

Freshservice supports outbound webhooks through the Workflow Automator. When certain update, change or action occurs, webhooks can be used to push data to an external application. The Workflow Automator can be used to create workflows to trigger a Webhook when a specific Event occurs.

Webhooks are configured as actions within Workflow Automator rules, not as standalone subscription-based webhook registrations. You define a trigger event, optional conditions, and a "Trigger Webhook" action that sends an HTTP request (POST/PUT/GET) to a callback URL with configurable payload content (JSON, XML, or form-encoded). Placeholder variables for ticket/entity fields can be used in the payload.

### Ticket Events

Workflows can be triggered when tickets are created, updated, or when specific ticket field values change (e.g., status, priority, assignment). Events like "Ticket is raised," "Ticket is updated," "Note added," and "Reply is sent" are available as triggers.

- Conditions can be added to filter which tickets trigger the webhook (e.g., only high-priority tickets, specific categories).

### Change Events

Workflows can trigger webhooks when changes are created or updated.

### Problem Events

Workflows can trigger webhooks on problem creation or updates.

### Task Events

Workflows can trigger webhooks when tasks are created within tickets.

**Limitations**:

- Webhooks are configured manually in the Freshservice admin UI via Workflow Automator; there is no API to programmatically register or manage webhook subscriptions.
- Each workflow must be configured separately per event type and module.
- Webhook payloads use Freshservice's placeholder syntax (e.g., `{{ticket.id}}`, `{{ticket.status}}`).
- The "Trigger Webhook" action supports authentication via username/password or API key for the target URL.
