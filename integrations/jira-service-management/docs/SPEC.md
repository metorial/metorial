Let me get the full list of webhook events and the JSM-specific scopes.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Jira Service Management

## Overview

Jira Service Management (JSM) is an Atlassian IT service management (ITSM) product built on the Jira Cloud platform. It provides customer request portals, support queues, SLAs, knowledge bases, incident management, change management, asset/configuration management, and on-call operations. The API exposes both JSM-specific service desk functionality and the underlying Jira platform capabilities.

## Authentication

JSM supports two primary authentication methods for external integrations:

### Basic Authentication (API Token)

For simple scripts and personal integrations. Requires:

- **Email**: The Atlassian account email address.
- **API Token**: Generated from your Atlassian account settings (https://id.atlassian.com/manage-profile/security/api-tokens).
- Credentials are sent as a Base64-encoded `email:api_token` string in the `Authorization: Basic <encoded>` header.
- API base URL: `https://{your-domain}.atlassian.net/rest/servicedeskapi/` for JSM endpoints, and `https://{your-domain}.atlassian.net/rest/api/3/` for Jira platform endpoints.

### OAuth 2.0 (3-Legged OAuth / Authorization Code Grant)

Recommended for integrations and apps. Uses Atlassian's OAuth 2.0 (3LO) flow:

- **Register your app** in the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/).
- **Authorization endpoint**: `https://auth.atlassian.com/authorize`
- **Token endpoint**: `https://auth.atlassian.com/oauth/token`
- **Required parameters**: `client_id`, `client_secret`, `redirect_uri`, `scope`, and `state`.
- After authorization, you must call `https://api.atlassian.com/oauth/token/accessible-resources` to retrieve the `cloudId` for the user's Atlassian site. API calls then use: `https://api.atlassian.com/ex/jira/{cloudId}/rest/...`
- **Refresh tokens**: Use rotating refresh tokens. Add `offline_access` to scopes to receive a refresh token. Refresh tokens are single-use and issue a new refresh token with each rotation.
- **Classic scopes** (recommended) for JSM-specific access:
  - `read:servicedesk-request` — Read customer requests, approvals, attachments, comments, SLAs, and request types.
  - `write:servicedesk-request` — Create and manage customer requests.
  - `manage:servicedesk-customer` — Manage customers and organizations.
- **Classic scopes** for Jira platform access:
  - `read:jira-work` — Read issues, projects, and related data.
  - `write:jira-work` — Create and edit issues.
  - `manage:jira-project` — Manage project settings.
  - `manage:jira-configuration` — Jira administration actions.
  - `manage:jira-webhook` — Register and manage webhooks.
- **Operations API scopes** (for on-call, alerts, schedules): `read:ops-config:jira-service-management`, `write:ops-config:jira-service-management`, etc.
- Granular scopes are also available for fine-grained access (e.g., `read:request:jira-service-management`, `write:organization:jira-service-management`).

## Features

### Service Desk & Project Management

Retrieve and manage service desk projects, including listing available service desks, viewing their configurations, and managing which customers and organizations are associated with each service desk.

### Customer Request Management

Create, view, search, and transition customer requests (service desk tickets). Supports adding comments, attachments, and request participants. Requests can be raised on behalf of customers. Request fields vary by request type.

### Request Types

View and manage request types configured for each service desk, including their field definitions, properties, and groupings. Request types define the forms customers use to submit requests.

### Approvals

View and action approval decisions on customer requests. Approvers can approve or decline requests through the API.

### SLA Tracking

Read SLA information for customer requests, including current SLA status and cycle details (e.g., time to first response, time to resolution).

### Customer Management

Create and manage customer (end-user) accounts. Add or remove customers from service desks. Manage customer details and entitlements.

### Organization Management

Create, update, delete, and list organizations. Add or remove users from organizations. Associate or disassociate organizations with service desks. Manage organization properties, details, and entitlements.

### Queues

View service desk queues and the issues within them. Queues are pre-configured filters for agents to manage incoming work.

### Knowledge Base

Search and retrieve knowledge base articles linked to a service desk. Articles are sourced from linked Confluence spaces.

### Assets (CMDB)

Manage assets/configuration items including schemas, object types, objects, and their attributes. Supports creating, reading, updating, and deleting asset records, and importing data.

- Requires separate Assets-specific scopes (e.g., `read:cmdb-object:jira`, `write:cmdb-object:jira`).

### Operations (Incident & Alert Management)

Manage on-call operations including alerts, schedules, rotations, escalation policies, routing rules, notification rules, and integrations. Available on Premium and Enterprise plans.

- The Operations API uses a separate base URL: `https://api.atlassian.com/jsm/ops/api/{cloudId}/v1/...`

### Products & Entitlements

Manage products and entitlements associated with customers and organizations, enabling service catalog and entitlement tracking.

### Underlying Jira Platform Features

Since JSM is built on Jira, all standard Jira platform API capabilities are accessible, including full issue CRUD, workflow transitions, custom fields, search (JQL), projects, users, components, versions, worklogs, dashboards, and permissions management.

## Events

JSM inherits the Jira platform webhook system. Webhooks can be registered via the Jira administration UI, the REST API, or programmatically via Connect/Forge app descriptors. Webhooks can be filtered using JQL to limit delivery to specific issues or projects.

### Issue Events

Fires when issues (including service requests) are created, updated, or deleted. Includes the full issue payload and, for updates, a changelog of changed fields.

- Events: `jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted`
- Supports JQL filtering.

### Comment Events

Fires when comments on issues are created, updated, or deleted.

- Events: `comment_created`, `comment_updated`, `comment_deleted`
- Supports JQL filtering.

### Attachment Events

Fires when attachments are added to or removed from issues.

- Events: `attachment_created`, `attachment_deleted`
- Supports JQL filtering.

### Worklog Events

Fires when worklogs are created, updated, or deleted.

- Events: `worklog_created`, `worklog_updated`, `worklog_deleted`
- Supports JQL filtering.

### Issue Link Events

Fires when issue links are created or deleted.

- Events: `issuelink_created`, `issuelink_deleted`

### Issue Property Events

Fires when issue entity properties are set or deleted.

- Events: `issue_property_set`, `issue_property_deleted`
- Supports JQL filtering.

### Project Events

Fires on project lifecycle changes including creation, update, deletion, archival, and trash/restore actions.

- Events: `project_created`, `project_updated`, `project_deleted`, `project_soft_deleted`, `project_restored_deleted`, `project_archived`, `project_restored_archived`

### Version Events

Fires when project versions are created, updated, moved, released, unreleased, deleted, or merged.

- Events: `jira:version_created`, `jira:version_updated`, `jira:version_moved`, `jira:version_released`, `jira:version_unreleased`, `jira:version_deleted`
- Does not support JQL filtering.

### Sprint Events

Fires when sprints are created, started, updated, closed, or deleted.

- Events: `sprint_created`, `sprint_started`, `sprint_updated`, `sprint_closed`, `sprint_deleted`
- Does not support JQL filtering.

### Board Events

Fires when boards are created, updated, deleted, or their configuration changes.

- Events: `board_created`, `board_updated`, `board_deleted`, `board_configuration_changed`

### User Events

Fires when users are created, updated, or deleted.

- Events: `user_created`, `user_updated`, `user_deleted`

### Issue Type Events

Fires when issue types are created, updated, or deleted.

- Events: `issuetype_created`, `issuetype_updated`, `issuetype_deleted`

### Filter Events

Fires when saved filters are created, updated, or deleted.

- Events: `filter_created`, `filter_updated`, `filter_deleted`

### JSM Automation Webhooks

JSM also supports outbound webhooks as actions in automation rules. These are triggered based on configurable conditions (WHEN/IF rules) and can send custom or standard payloads to a specified URL when service management events occur (e.g., SLA breach, request status change). These are configured within JSM's automation engine rather than the platform webhook system.
