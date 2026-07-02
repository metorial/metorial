Now let me get details on the OAuth scopes and webhook event details:Now I have enough information to write the specification.

# Slates Specification for Sentry

## Overview

Sentry is an application monitoring platform that provides error tracking, performance monitoring, and release health for software applications. It captures and groups errors into issues, tracks transactions and performance metrics, and offers tools for debugging and triaging across projects and teams. Sentry supports over 100 platforms and frameworks via its SDKs, and exposes a web API for programmatic access to its resources.

## Authentication

Sentry supports multiple authentication methods:

### Auth Tokens (Bearer Token)

The primary and recommended method. Tokens are passed via the `Authorization: Bearer <token>` header. There are three types of auth tokens:

- **Organization Tokens**: Bound to an organization with fixed, limited permissions suitable for CI/CD use cases. Created under organization settings.
- **Internal Integration Tokens**: Bound to an organization with customizable and editable permissions. Created by setting up an Internal Integration under **Settings > Developer Settings**. Recommended when full API access is needed on behalf of an organization.
- **Personal Tokens**: Bound to a user and scoped to the organizations/projects that user can access. Created under **Account > User Auth Tokens**. Permissions are customizable at creation time but cannot be edited later.

Scopes control access to API resources. Available scope categories are:

- `org:read`, `org:write`, `org:admin` — Organizations
- `project:read`, `project:write`, `project:admin` — Projects
- `project:releases` — Releases (covers both project and organization release endpoints)
- `team:read`, `team:write`, `team:admin` — Teams
- `member:read`, `member:write`, `member:admin` — Members
- `event:read`, `event:write`, `event:admin` — Issues & Events

### OAuth 2.0 (Authorization Code Flow)

Used by public integrations (Sentry Apps) and partner integrations. Supports PKCE.

- **Authorization endpoint**: `https://sentry.io/oauth/authorize/`
- **Token endpoint**: `https://sentry.io/oauth/token/`
- Requires a `client_id` and `client_secret` obtained by creating a public integration under **Settings > Developer Settings**, or by registering via Sentry's partnership team.
- The access token is scoped to the specific organization the user selects during the OAuth flow.
- Refresh tokens are supported via `grant_type=refresh_token`.

### OAuth 2.0 (Device Authorization Grant)

For CLI tools, CI/CD pipelines, and headless environments.

- **Device code endpoint**: `https://sentry.io/oauth/device/code/`
- **Token endpoint**: `https://sentry.io/oauth/token/`
- Requires a `client_id`. The application requests a device code, displays a user code, and polls for authorization.

### DSN (Client Key) Authentication

Used for limited SDK-related endpoints (e.g., submitting user reports). Passed via `Authorization: DSN <dsn>`. Very limited in scope.

### API Keys (Legacy)

Deprecated and disabled for new accounts. Passed via HTTP Basic Auth with the API key as the username and an empty password.

### Region-Specific Hosts

For data-region-aware API calls, use region-specific domains: `us.sentry.io` (US) or `de.sentry.io` (DE) instead of `sentry.io`.

## Features

### Organization Management

Create, read, update, and manage organizations. View organization-level statistics, settings, and onboarding status. Manage organization-wide settings like data scrubbing rules, trusted relays, and quota policies.

### Team Management

Create, list, update, and delete teams within an organization. Assign and remove projects from teams. Manage team membership and roles.

### Project Management

Create and configure projects within an organization. Each project represents a distinct application or service component. Configure project settings including platforms, environments, data filters, inbound data rules, and symbol sources.

### Issues & Events

List, retrieve, update, and delete issues (grouped error events). Query issues using structured search with filters like status, assignment, and tags. Bulk-mutate or bulk-remove issues. Retrieve individual error events, their stack traces, tags, and contextual data. Issues can be resolved, ignored, assigned to team members, or marked for bookmarking.

### Releases & Deploys

Create and manage releases tied to an organization. Associate commits with releases to enable suspect commit detection. Upload source maps and debug files for symbolication. Track deploys per environment. List files changed in a release's commits.

### Alerts & Notifications

Create and manage issue alert rules (trigger-based rules for specific error conditions) and metric alert rules (threshold-based rules on aggregate data like error counts or transaction durations). Configure notification actions such as sending to integrations.

### Cron Monitoring

Set up and manage cron monitors to track scheduled jobs. Detect missed or failed check-ins. Configure check-in schedules and alerting thresholds.

### Dashboards

Create and manage custom dashboards with configurable widgets. Widgets can display issue data, discover queries, and performance metrics.

### Discover & Performance

Query event data using Sentry's Discover interface. Run arbitrary queries across errors and transactions with custom fields, filters, and aggregations. Useful for performance analysis and ad-hoc investigation.

### Session Replays

Access session replay data to see what users experienced in the browser before and during errors.

### SCIM (User Provisioning)

Provision and deprovision organization members and teams via the SCIM 2.0 protocol, enabling integration with identity providers for automated user lifecycle management.

### Integration Platform

Manage Sentry integrations (both internal and public). List and configure external integrations such as GitHub, Jira, Slack, and others installed in an organization.

### Seer (AI)

Access AI-powered features including listing AI models, retrieving AI-generated issue fix states, and initiating automated issue fix suggestions.

## Events

Sentry supports webhooks via its Integration Platform. Webhooks are configured when creating an internal or public integration under **Settings > Developer Settings**. You provide a webhook URL and select which event types to subscribe to. Webhook payloads are signed using HMAC-SHA256 with your integration's Client Secret for verification.

### Installation

Fires when a Sentry integration (public app) is installed or uninstalled by a user. Useful for tracking which organizations have your integration active.

### Issue Alerts

Fires when an issue alert rule is triggered. Contains the event that triggered the rule, the associated issue, and the rule label. Only available for integrations that have been configured as an alert rule action.

### Metric Alerts

Fires when a metric alert rule changes state (e.g., from normal to warning or critical, or back to resolved). Contains the alert rule details and current status.

### Issues

Fires when an issue is created, resolved, assigned, ignored, or archived. Provides the issue data and the action that was taken.

### Comments

Fires when a comment is created, updated, or deleted on an issue. Contains the comment content and associated issue information.

### Errors

Fires when a new error event is received by Sentry. Contains the error event payload including exception data, stack trace, and contextual information.

### Seer

Fires for events related to Sentry's AI-powered analysis features.
