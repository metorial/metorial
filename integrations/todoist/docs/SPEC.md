Now let me get the OAuth and webhook details from the official docs:Now I have comprehensive information from the official Todoist API v1 documentation. Let me compile the specification.

# Slates Specification for Todoist

## Overview

Todoist is a task management application that allows users to organize tasks into projects, assign labels, set due dates and deadlines, add comments, create filters, and collaborate with others. It provides both a REST-style API and a Sync endpoint for efficient data synchronization, along with workspace support for team collaboration.

## Authentication

Todoist supports two authentication methods:

### Personal API Token (Bearer Token)

Users can obtain a personal API token from the integrations settings in their Todoist account. Authorized calls require an `Authorization: Bearer $token` header.

### OAuth 2.0

The following items are needed: Client ID, Client Secret, and Redirect URL. These can be found in the Todoist App Management Console.

**OAuth Flow:**

1. **Authorization Request:** Redirect users to `https://app.todoist.com/oauth/authorize` with `client_id`, `scope`, and `state` parameters.
2. **Redirect:** Upon granting access, the user is redirected to your configured redirect URL with a `code` and `state` parameter.
3. **Token Exchange:** Exchange the authorization code for an access token by sending a POST request to `https://api.todoist.com/oauth/access_token` with `client_id`, `client_secret`, and `code`.

The response returns an `access_token` with `token_type: "Bearer"`.

**Available Scopes:**

| Scope             | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `task:add`        | Add new tasks only                                          |
| `data:read`       | Read-only access to tasks, projects, labels, and filters    |
| `data:read_write` | Read and write access (includes `task:add` and `data:read`) |
| `data:delete`     | Delete tasks, labels, and filters                           |
| `project:delete`  | Delete projects                                             |
| `backups:read`    | List backups bypassing MFA requirements                     |

**Token Revocation:** Access tokens can be revoked via `DELETE /api/v1/access_tokens` (passing `client_id`, `client_secret`, and `access_token`) or via the RFC 7009-compliant endpoint `POST /api/v1/revoke`.

## Features

### Task Management

Create, read, update, delete, complete, uncomplete, and reopen tasks. Tasks support rich content (markdown), descriptions, due dates (full-day, floating time, or fixed timezone), deadlines, priorities (1–4), labels, durations, and recurring schedules. Tasks can be organized as sub-tasks via parent-child relationships. A **Quick Add** feature allows creating tasks using natural language parsing (e.g., "Buy milk tomorrow at 10am #Shopping @errands p1").

- Tasks can be assigned to collaborators in shared projects.
- Tasks can be filtered using Todoist's powerful filter query syntax.
- Completed tasks can be retrieved by completion date or by due date within configurable date ranges.

### Project Management

Create, read, update, delete, archive, and unarchive projects. Projects support nesting (sub-projects), color customization, and multiple view styles (list, board, calendar). Projects can be shared with collaborators and moved between personal space and workspaces.

- Projects can be searched by name.
- Project templates can be exported and imported (as CSV files or via URL).

### Sections

Create, read, update, delete, archive, and unarchive sections within projects. Sections help organize tasks into groups within a project and can be reordered.

### Labels

Create, read, update, and delete personal labels. Labels can be applied to tasks across projects. Shared labels (created by collaborators) appear on shared tasks and can be renamed or removed in bulk.

- Labels can be searched by name.

### Comments

Add, read, update, and delete comments on both tasks and projects. Comments support markdown formatting and file attachments. Users can be mentioned/notified via `uids_to_notify`. Comments support emoji reactions.

### Filters

Create, read, update, and delete saved filter views using Todoist's query language (e.g., "priority 1 & today"). Workspace filters are also available for team use on Business plans.

- Some features (filters, reminders, etc.) are limited based on the user's subscription plan.

### Reminders

Create, update, and delete reminders on tasks. Three types are supported: **relative** (minutes before due date), **absolute** (specific date/time), and **location-based** (triggered on entering or leaving a geographic area).

- Reminders require a paid plan.

### Sharing & Collaboration

Share projects with other users by email. Manage collaborators (add, remove, change roles). Accept or reject project invitations. In workspace projects, granular roles are available: Creator, Admin, Read/Write, Edit Only, Complete Only.

### Workspaces (Teams)

Create, update, and delete workspaces for team collaboration. Manage workspace members and their roles (Admin, Member, Guest). Invite users via email or link. Move projects between personal space and workspaces. Workspace-specific features include folders, workspace filters, domain-based auto-join, and configurable default collaborators.

### User & Productivity

Retrieve and update user profile settings (timezone, date/time format, language, start page, etc.). View productivity statistics including completed task counts, karma score, and daily/weekly streaks. Configure karma goals and vacation mode.

### Activity Log

View a log of all changes across projects, tasks, and comments. Supports filtering by object type, event type, user, workspace, and date range.

- Activity log retention depends on the user's plan.

### File Uploads

Upload files for use as attachments in comments. Supports images (with auto-generated thumbnails) and audio files.

### Backups

Retrieve daily automatic backup archives of user data (available on paid plans).

### Email Integration

Generate email addresses that forward to specific projects or tasks, allowing task/comment creation via email.

## Events

The official Todoist API does support webhooks. You can subscribe to event types to receive real-time notifications for user events.

Webhooks are activated when a user completes the OAuth flow for an app that declares the webhook. Webhook configuration (callback URL and subscribed events) is set in the Todoist App Management Console, not via API. Webhook URLs must use HTTPS and cannot specify ports.

Webhook requests include headers like User-Agent, X-Todoist-Hmac-SHA256 for verification, and X-Todoist-Delivery-ID for uniqueness. The HMAC is generated using the app's `client_secret`.

### Task Events

Real-time notifications when tasks are created, updated, deleted, completed, or uncompleted. The `item:updated` event can include extra metadata such as `old_item` and `update_intent` to distinguish between user-initiated updates and recurring task completions.

- Events: `item:added`, `item:updated`, `item:deleted`, `item:completed`, `item:uncompleted`

### Project Events

Notifications when projects are created, updated, deleted, archived, or unarchived.

- Events: `project:added`, `project:updated`, `project:deleted`, `project:archived`, `project:unarchived`

### Comment Events

Notifications when comments (on tasks or projects) are created, updated, or deleted.

- Events: `note:added`, `note:updated`, `note:deleted`

### Section Events

Notifications when sections are created, updated, deleted, archived, or unarchived.

- Events: `section:added`, `section:updated`, `section:deleted`, `section:archived`, `section:unarchived`

### Label Events

Notifications when labels are created, updated, or deleted.

- Events: `label:added`, `label:updated`, `label:deleted`

### Filter Events

Notifications when filters are created, updated, or deleted.

- Events: `filter:added`, `filter:updated`, `filter:deleted`

### Reminder Events

Notification when a reminder fires.

- Events: `reminder:fired`
