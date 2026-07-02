# Slates Specification for Honeybadger

## Overview

Honeybadger is an application monitoring platform that provides error tracking, uptime monitoring, check-ins (cron job monitoring), logging/insights, and status pages. It supports multiple programming languages including Ruby, JavaScript, Python, PHP, Elixir, and Go.

## Authentication

Honeybadger uses two types of authentication depending on the API being accessed:

### 1. Personal Auth Token (for the Data API / REST API)

Authentication to the Data API is performed via HTTP Basic Auth. Each request should be sent with your personal authentication token as the basic auth username value. No password is required.

- **Where to find it:** The personal auth token is used for Data API commands. Find your token under the "Authentication" tab in your user settings.
- **Usage example:** `curl -u AUTH_TOKEN: https://app.honeybadger.io/v2/projects` (the trailing colon prevents a password prompt).

### 2. Project API Key (for the Reporting API)

The project API key is used for Reporting API commands (deploy, agent). Find your key in your project settings. This key is sent via the `X-API-Key` header when reporting errors, events, check-ins, deployments, and source maps.

## Features

### Error Management

Retrieve, search, and manage errors (called "faults" in the API) across projects. You can view error occurrences (notices), resolve or unresolve errors, assign errors to team members, and add comments. Errors can be filtered by environment, component, and action.

### Error and Event Reporting

Report exceptions and custom events from your applications to Honeybadger. Events sent to the reporting API appear in Honeybadger Insights, where you can query and visualize the events. Custom events can represent any application-specific data such as user signups, payment events, or performance metrics.

### Uptime Monitoring

Manage uptime checks (called "sites" in the API) that monitor whether your web applications and APIs are responsive. View outage history and current status.

### Check-ins

Manage dead-man-switch style checks that monitor scheduled tasks and cron jobs. You can create, update, and delete check-ins, and report check-in pings via the Reporting API.

### Deployment Tracking

Record and retrieve deployment information for your projects. Deployments can be reported with details like revision, repository, environment, and local username.

### Insights and Logging

Query logs and custom events using BadgerQL, Honeybadger's query language. You can send structured log data and custom events, then run analytical queries against them.

### Project Management

Create, update, and list projects. Each project is a container that holds errors, check-ins, uptime checks, and other data for a single application or service.

### Team and Account Management

Manage teams that connect users to projects, invite users to join teams, and manage account-level settings.

### Status Pages

Create and manage public status pages that give users insight into your system's operational status.

### Environment Management

Manage environments (e.g., production, staging) within your projects to organize error data and monitoring by deployment context.

### Comments

Add and retrieve comments on errors to facilitate team collaboration around issue resolution.

## Events

Honeybadger sends webhooks when certain events occur in your Honeybadger projects. Each event type has a specific payload structure with relevant data about the event.

Webhooks are configured per-project by administrators via the Alerts & Integrations tab in Project Settings, where you specify a URL to receive POST requests with JSON payloads.

### Error Events

- **occurred** — Sent when an error occurs. Includes project, fault, and notice details.
- **resolved** — Sent when an error is marked as resolved.
- **unresolved** — Sent when a previously resolved error occurs again.
- **assigned** — Sent when an error is assigned to a user. Includes assignee info.
- **commented** — Sent when a comment is added to an error.
- **rate_exceeded** — Sent when an error rate threshold is exceeded.

### Uptime Events

- **down** — Sent when an uptime check fails. Includes site and outage details.
- **up** — Sent when an uptime check succeeds after being down.
- **cert_will_expire** — Sent when an SSL certificate is about to expire.

### Check-in Events

- **check_in_missing** — Sent when an expected check-in ping is missing (scheduled task didn't report in).
- **check_in_reporting** — Sent when a previously missing check-in reports successfully.

### Deployment Events

- **deployed** — Sent when a deployment is recorded. Includes deploy details.
