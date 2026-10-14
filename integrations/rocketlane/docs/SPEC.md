# Rocketlane Integration Specification

## Overview

Rocketlane is a collaborative customer onboarding and implementation platform for professional services teams. It provides project management, task tracking, time tracking, resource allocation, document collaboration, and customer-facing portals to manage onboarding workflows.

## Authentication

Rocketlane uses **API Key** authentication exclusively.

To generate an API key, go to the Rocketlane application, select your profile icon from the vertical navigation bar on the left, and then select Settings. Navigate to the **API** section and select **Create API key**, provide a name, and the key will be generated.

Authentication can be performed using the active API key. The API key must be passed as an HTTP header named `api-key` on every request.

Example:

```
--header 'api-key: <your-api-key>'
```

The permissions of API Keys match those of the user who created them. API keys have expiration dates and can be deleted/revoked at any time.

The base URL for all API requests is: `https://api.rocketlane.com/api`, followed by the version number (e.g., `/1.0/`).

## Features

### Project Management

Create, read, update, delete, and archive projects. Projects can include details such as project name, dates, team members, and custom fields. You can add or remove project members and manage project lifecycle states (e.g., archiving).

### Task Management

Tasks make it easier to delegate resources and manage projects by dividing them into trackable action items. You can create, update, delete, and move tasks between phases. Tasks support assignees, followers, dependencies, subtasks, start/end dates, effort tracking, progress, and at-risk flags. Custom fields can be attached to tasks.

### Phase Management

Rocketlane offers a phased approach to project management, allowing teams to break down projects into distinct phases. You can create, update, delete, and list phases within a project, including setting start/end dates and privacy types (private or shared).

### Company Management

Create, update, and list companies (customers). Companies can have custom fields and associated notes fields. Companies represent the customer organizations associated with onboarding projects.

### User Management

List and search for users (both vendor and customer users). Users can be looked up by ID or email. You can also list customer users and vendor users separately.

### Time Tracking

Create, update, delete, and search time entries. Supports time entry categories for organizing logged time. Time entries can be associated with tasks and projects.

### Spaces & Documents

Spaces are collaborative areas within projects for sharing files and documents with team members and customers. You can create, update, delete spaces, and manage space documents within them.

### Conversations & Comments

Create and manage conversations within projects, including adding/removing members. Comments can be created, retrieved, and deleted within conversations or tasks.

### Custom Fields

Create, update, delete, and list custom fields for projects, tasks, and companies. Field options can be added and updated for dropdown-type fields. The fields endpoint uses `objectType.eq` to select project, task, or company fields. Field options use provider-assigned numeric option IDs. Creation sends a label and a documented color; the optional color input defaults to GRAY.

### Templates

List and retrieve project templates by ID. Data pertaining to tasks, projects, templates, forms, and time tracking is accessible programmatically. Templates can be used as sources when creating new projects.

### Resource Allocations

Retrieve resource allocation data across projects, enabling visibility into team workload and capacity planning.

### Financials

Search invoices and retrieve subscription details. Supports listing available currencies.

## Tool API conventions

- Project templates use `sources`, and project members use `teamMembers.members`. Project creation requires a customer and an owner, plus a start date when applying a template.
- Task creation references `project`, `phase`, and `parent` objects. Effort maps to `effortInMinutes`, descriptions to `taskDescription`, and status to `{ value: <numeric option ID> }`. The public task output retains flattened project/phase IDs and arrays of assignees/followers.
- Task assignee/follower updates use the dedicated add/remove relationship endpoints. Moving a task uses `/tasks/{taskId}/move-phase`.
- Time-entry duration maps to `minutes`; task/project, user, and category identifiers use nested objects. Description maps to `notes`. Updating a time entry preserves the existing date or minutes when omitted.
- List responses expose cursor pagination. Supply `pageToken` from `pagination.nextPageToken` within 15 minutes. Legacy `offset` inputs traverse pages; use cursor pagination for large results.
- `list_phases` and `list_spaces` require a project ID at invocation. `list_resource_allocations` requires a start/end date range.
- `get_company` and `get_phase` retrieve the individual company/phase from their corresponding discovery tools.
- The current API reference does not provide a documented API-key-owner identity endpoint. No inferred identity endpoint is called.
- Invoice project filtering is applied to each provider page using its `projects` relationships; pagination and status filtering still use the provider API.

Official API reference: https://developer.rocketlane.com/reference

## Events

Rocketlane webhooks are triggered by specific events, such as task updates, project changes, or user actions. Webhooks enable real-time updates, eliminating the need for polling or periodic checks. External systems receive information instantly when a relevant event occurs within Rocketlane.

Webhooks are configured through the Rocketlane UI under Settings > Webhooks, and are used within automations by selecting trigger events and associating a webhook action.

### Task Events

Currently, Rocketlane only supports task triggers for webhooks. Supported event types include:

- **Task Created** — Triggered when a new task is created.
- **Task Updated** — Triggered when a task is modified (e.g., name, assignees, status, dates, progress). The payload includes a changelog showing which fields changed and their previous/new values.

Webhook payloads include the full task object, actor information (who triggered the event), and timestamps. Rocketlane supports authentication for webhooks to secure communication, though only Basic Authentication is currently supported (username and password on the receiving endpoint).

- Conditions can be configured on automations to filter which task changes trigger the webhook (e.g., only when specific fields change).
- The order in which events are delivered via webhooks is not guaranteed to be strictly chronological.
- Rocketlane guarantees exactly one delivery per event.
