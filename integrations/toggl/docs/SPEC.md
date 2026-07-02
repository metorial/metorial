Now let me get the full list of webhook event entities and more details about the API features:Let me get the full list of webhook events and the Toggl Track API features from the documentation:Now I have enough information to write the specification.

# Slates Specification for Toggl

## Overview

Toggl (specifically Toggl Track) is a time tracking service that allows users and teams to track time spent on tasks and projects. It provides workspaces, projects, clients, tags, tasks, and time entries as core resources, along with a Reports API for aggregated data and analytics. Organizations serve as an administrative layer above workspaces for managing settings and users across multiple workspaces.

## Authentication

Toggl Track's API (v9) supports the following authentication methods:

### API Token (Basic Auth)

The primary method uses HTTP Basic Auth with the user's API token as the username and the literal string `api_token` as the password. Each user has an API token, which can be found under "My Profile" in their Toggl account.

- **Base URL:** `https://api.track.toggl.com/api/v9/`
- **Format:** `Authorization: Basic base64({api_token}:api_token)`
- Example: `curl -u 1971800d4d82861d8f2c1651fea4d212:api_token https://api.track.toggl.com/api/v9/me`

### Email & Password (Basic Auth)

Basic Auth can also be used with the user's email and password as credentials.

- **Format:** `Authorization: Basic base64({email}:{password})`

### Session Cookie

It's possible to create a session. The session creation request sets a cookie in the response header `__Secure-accounts-session`, which can be used for authentication in all API requests.

- **Endpoint:** `POST https://accounts.toggl.com/api/sessions`
- The session cookie is returned in the `Set-Cookie` response header.

If authentication fails, HTTP status code 403 is returned.

### Toggl Plan API (separate product)

Note: Toggl Plan (a separate project planning product) uses OAuth 2.0 for authentication. Authentication is implemented by OAuth 2.0. A registered OAuth application is assigned a unique Client ID (API Key) and Client Secret (API Secret). This is a distinct API at `api.plan.toggl.com` and should not be confused with the Toggl Track API.

## Features

### Time Tracking

Create, read, update, and delete time entries within workspaces. Start a running time entry (with a negative duration value) and see it in the Toggl Track web app. Stop running entries, insert completed entries with explicit start/duration, and query time entry history. Time entries support descriptions, tags, billable flags, and assignment to projects and tasks. The API also supports adding time entries for other users ("add time for team"), available on Premium or Enterprise plans.

- Time entries are scoped to a workspace.
- Querying time entries via the `/me/time_entries` endpoint is limited to a 3-month lookback window. For older data, the Reports API must be used.

### Projects & Tasks

Manage projects within workspaces, including creating, updating, and deleting them. Projects can be assigned to clients, marked as billable, and configured with hourly rates. Tasks can be created under projects for more granular categorization of time entries.

- Projects can be set as public or private.
- Project users (members) can be managed to control who has access.
- Project groups allow grouping of related projects.

### Clients

Create and manage clients within a workspace. Each project can be assigned a client. Clients serve as a grouping mechanism for projects and are useful for billing and reporting purposes.

### Tags

Manage tags within a workspace. Tags are used to mark specific time entries, enabling cross-project filtering and categorization. Tags can be added or removed from time entries individually or in bulk.

### Workspaces

Time entries belong to a specific workspace. When you sign up, a Default Workspace is automatically created. You can also sign up via invitation into a workspace. Workspaces have configurable settings like default currency, hourly rates, rounding rules, and permissions (e.g., whether only admins can create projects or tags).

### Organizations

Organizations are an extra layer of administrative control above the Workspace level that allows you to manage settings and users for multiple workspaces. You can create organizations, manage organization-level users, assign roles, and manage groups.

### User Management

Manage workspace users and organization users, including inviting users, assigning roles (admin, regular user), and removing users. Workspace user endpoints allow listing members and controlling access.

### Reports

The read-only Reports API gives you time entries of all workspace users and aggregated data for reporting, with many options for filtering, grouping and sorting. Available report types include:

- **Detailed reports**: Individual time entries with full detail.
- **Summary reports**: Aggregated time data grouped by various dimensions.
- **Weekly reports**: Time data organized by week.

Reports can be filtered by projects, clients, tags, users, date ranges, billable status, and more. This is a specialized API focused on generating reports and aggregating data, particularly useful for creating custom reports or integrating reporting capabilities into other systems.

- Some report features require paid plans.

## Events

The Webhooks API allows you to create subscriptions to be notified about modifications made to your workspace entities. A user may define one or more webhook subscriptions per workspace. Each subscription may have different filters to receive notifications about a sub-set of events for supported entities.

- **Base URL:** `https://api.track.toggl.com/webhooks/api/v1`
- A subscription must be both enabled and validated before events are sent to its corresponding URL endpoint.
- Toggl includes an `X-Webhook-Signature-256` header for payload verification using a shared secret.
- The visibility access of the subscription's creator will be taken into account to filter out events that the creator has no access to.
- Event filters are specified as entity/action pairs (e.g., `{"entity": "project", "action": "created"}`). Wildcards (`*`) are supported for both entity and action.
- Webhook limits vary by plan: Free gets 1 webhook (up to 3 events), Starter gets 2 webhooks (up to 6 events), Premium gets 3 webhooks (up to 12 events).

### Supported Event Categories

Each of the following entity types supports **created**, **updated**, and **deleted** actions:

- **Clients**: Notifications when clients are created, updated, or deleted.
- **Projects**: Notifications when projects are created, updated, or deleted.
- **Project Groups**: Notifications when project groups are created, updated, or deleted.
- **Project Users**: Notifications when project user assignments are created, updated, or deleted.
- **Tags**: Notifications when tags are created, updated, or deleted.
- **Tasks**: Notifications when tasks are created, updated, or deleted.
- **Time Entries**: Notifications when time entries are created, updated, or deleted.
- **Workspaces**: Notifications when workspaces are created, updated, or deleted.
- **Workspace Users**: Notifications when workspace user memberships are created, updated, or deleted.
