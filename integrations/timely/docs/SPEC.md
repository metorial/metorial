# Slates Specification for Timely

## Overview

Timely is an AI-powered automatic time tracking application for teams, focused on project-based work for consultancies, agencies, and software companies. It helps teams stay connected and report accurately across client, project and employee hours. The API (v1.1) allows programmatic management of time entries, projects, clients, users, teams, labels, reports, tasks/forecasts, and webhooks.

## Authentication

Timely supports **OAuth 2.0** using the Authorization Code grant type. There are no API key-based authentication methods.

### Setup

1. To begin setup, please ensure you are an admin level user on the workspace.
2. Create an OAuth Application (only available to the Admin User) at `https://app.timelyapp.com/:account_id/oauth_applications`. Enter your application name and redirect URL.
3. Take note of your **Client ID** and **Client Secret**.

### OAuth 2.0 Flow

**Authorization endpoint:** `https://api.timelyapp.com/1.1/oauth/authorize`

Required parameters:

- `response_type`: `code`
- `redirect_uri`: Your application's callback URL
- `client_id`: Your application ID

If the user accepts your request, Timely will redirect back with the code parameter, which you need to use to get the token.

**Token endpoint:** `https://api.timelyapp.com/1.1/oauth/token`

Required parameters:

- `redirect_uri`: Your application's callback URL
- `code`: The authorization code received
- `client_id`: Your application ID
- `client_secret`: Your application secret
- `grant_type`: `authorization_code`

The response includes an `access_token` and a `refresh_token`. All API requests must include the access token in the `Authorization: Bearer <token>` header.

**Base URL:** `https://api.timelyapp.com/1.1`

All resource endpoints are scoped under an `account_id`, e.g., `/1.1/:account_id/projects`. There are no defined OAuth scopes — the token grants access based on the user's role (Admin, Manager, Employee, Team Lead).

**Note:** For security and privacy purposes, Memory is a private API so you won't be able to make calls to retrieve memories or post information to your timeline.

## Features

### Account Management

Retrieve account details including plan info, currency, capacity settings, and feature flags. A single user can belong to multiple accounts (workspaces).

### Time Entry Management (Events)

Create, read, update, and delete time entries (called "events" in Timely). Supports:

- Logging time for yourself or other users (permission-dependent).
- Specifying hours, minutes, date, project, notes, labels, hourly rate, and time range (from/to).
- Starting and stopping timers on events for real-time tracking.
- Marking events as billed/unbilled and billable/non-billable.
- Bulk create, update, and delete operations.
- Filtering events by date range, project, or user.

### Project Management

Create, read, update, and delete projects with configurable:

- Client assignment, color, description, and billable status.
- Hourly rate (project-level or user-level rates).
- Budget (amount and type), including recurring budgets with configurable intervals.
- User assignments with individual hour rates.
- Label/tag restrictions (all, none, or custom selection with required/optional flags).
- Team assignments.

### Client Management

Create, read, update, and archive clients. Clients represent the companies you work for. Each client has a name, color, and optional external ID for cross-referencing with external systems.

### Labels (Tags)

Create, read, update, and delete labels used to classify work on time entries. Labels support:

- Hierarchical structure (parent/child relationships).
- Custom emoji.
- Active/archived state.

### Task Planning (Forecasts)

Create, read, update, and delete forecasts (tasks) for planning upcoming work. Configure:

- Date range (from/to), estimated time, assigned users, project, and labels.
- Track completion status and compare planned vs. logged time.

### Team Management

Create, read, update, and delete teams. Assign users with lead/member roles. Teams can be associated with projects.

### User Management

Invite, update, and remove users from an account. Configure:

- Role (Admin, Manager, Employee, Team Lead) with different permission levels.
- Weekly capacity and work days.
- Project assignments with individual hour rates.
- Internal hour rates and visibility settings.

### Day Locking

Lock or unlock specific dates for specific users to prevent accidental changes or unauthorized edits to time records for those days.

### Reporting

Generate reports filtered by date range, users, projects, labels, and teams. Reports can be grouped by clients, users, labels, days, and teams. Includes metrics for duration, cost, billed/unbilled breakdown, internal cost, profit, and profitability.

- XLS, CSV, and PDF exports are only available via the web UI, not the API.

### Permissions

Retrieve permission details for the current user or a specific user, showing which resources they can create, read, update, or delete.

### Activity Feed

Retrieve a log of activities on the account such as logged hours, archived projects, and budget progress notifications.

## Events

Timely supports webhooks for real-time event notifications. Webhooks can be set up within Timely directly, via the Webhooks section of the Settings area, or via the API.

Webhooks are configured with:

- A target HTTPS URL that receives POST requests.
- An optional `secret_token` for verifying payloads via the `X-Signature` header (SHA256 hash).
- Subscriptions to specific event types, or a wildcard (`*`) for all events.
- An active/inactive toggle.

### Forecasts (Tasks)

- `forecasts:created` — A new task/forecast is created.
- `forecasts:updated` — An existing task/forecast is updated.
- `forecasts:deleted` — A task/forecast is deleted.

### Hours (Time Entries)

- `hours:created` — A new time entry is logged.
- `hours:updated` — An existing time entry is modified.
- `hours:deleted` — A time entry is deleted.

### Labels (Tags)

- `labels:created` — A new label is created.
- `labels:updated` — An existing label is modified.
- `labels:deleted` — A label is deleted.

### Projects

- `projects:created` — A new project is created.
- `projects:updated` — An existing project is modified.
- `projects:deleted` — A project is deleted.
