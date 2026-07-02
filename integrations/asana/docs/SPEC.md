Now let me get the full list of OAuth scopes and API resources:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Asana

## Overview

Asana is a work management platform used for project and task tracking, team collaboration, and workflow management. It provides a REST API that enables programmatic access to workspaces, projects, tasks, portfolios, goals, and other work management resources. The API supports CRUD operations on all core objects in the Asana hierarchy.

## Authentication

Asana supports three authentication methods. All methods use the `Authorization: Bearer <token>` header for API requests against the base URL `https://app.asana.com/api/1.0`.

### Personal Access Token (PAT)

A personal access token is the quickest and simplest way to authenticate with the API. PATs are long-lived tokens allowing programmatic authentication and should be stored securely. PATs provide the same level of access through the API as the user who generated them has in the Asana web product. You can generate a personal access token from the Asana developer console.

### OAuth 2.0

OAuth is a mechanism for applications to access the Asana API on behalf of a user, without the application having access to the user's username and password. This is the best choice if multiple users need to sign in to your app.

- **Authorization endpoint:** `GET https://app.asana.com/-/oauth_authorize`
- **Token exchange endpoint:** `POST https://app.asana.com/-/oauth_token`
- **Required credentials:** Client ID and Client Secret (obtained from the Asana developer console)
- **Flow:** Authorization Code with PKCE support (`code_challenge_method=S256`)
- Access tokens last one hour; refresh tokens can be used to obtain new access tokens without user intervention.

**Scopes:** Each scope follows the `<resource>:<action>` format. You can either toggle Full permissions (which grants access to all endpoints) or manually choose a specific set of OAuth scopes. Available scopes include:

- `attachments:read`, `attachments:write`, `attachments:delete`
- `custom_fields:read`, `custom_fields:write`
- `goals:read`
- `jobs:read`
- `portfolios:read`, `portfolios:write`
- `project_templates:read`
- `projects:read`, `projects:write`, `projects:delete`
- `roles:read`, `roles:write`, `roles:delete`
- `stories:read`, `stories:write`
- `tags:read`, `tags:write`
- `task_templates:read`
- `tasks:read`, `tasks:write`, `tasks:delete`
- `team_memberships:read`
- `teams:read`
- `time_tracking_entries:read`
- `timesheet_approval_statuses:read`, `timesheet_approval_statuses:write`
- `workspace.typeahead:read`
- `users:read`
- `webhooks:read`, `webhooks:write`, `webhooks:delete`
- `workspaces:read`
- OpenID Connect scopes: `openid`, `email`, `profile`

### Service Account Token

Similar to PATs, Service Accounts are long-lived tokens that provide programmatic access to the API. Service Accounts are an Enterprise tier feature and can only be created by Asana super admins. Service Accounts support additional scopes for SCIM (User Provisioning), Audit Logs, Organization Exports, and Workspace Events.

## Features

### Task Management

Create, read, update, and delete tasks within projects. Tasks support assignees, due dates, descriptions (with rich text), subtasks, dependencies/dependents, tags, followers, custom field values, and attachments. Tasks can be multi-homed across multiple projects and organized within sections.

### Project Management

Create and manage projects as lists or boards within workspaces and teams. Projects support custom field settings, sections for organizing tasks, task counts, duplication, and instantiation from project templates. Projects can be shared with specific teams.

### Portfolio Management

Create and manage portfolios to organize and track collections of projects. Portfolios support adding/removing project items and custom field settings.

### Goals

Read goals and their parent goals, including associated custom field settings. Goals provide visibility into organizational objectives.

### Custom Fields

Define and manage custom fields at the workspace level. Custom fields can be of various types (text, number, enum, etc.) and attached to projects, portfolios, and teams. Enum custom fields support managing enum options.

### Stories and Comments

Read and create stories (comments and activity entries) on tasks. Stories represent the activity feed on a task, including comments, status changes, and system-generated updates.

### Tags

Create and manage tags to categorize and label tasks across projects and workspaces.

### User and Team Management

Read user information, team memberships, and workspace memberships. List users within workspaces and teams. Access user task lists (My Tasks) and user favorites.

### Time Tracking

Read time tracking entries on tasks and access timesheet approval statuses. Manage timesheet approvals for tracked work.

### Search and Typeahead

Search for tasks within a workspace using various filters. Typeahead provides quick search across resources in a workspace for autocomplete functionality.

### Project and Task Templates

Read project templates and task templates. Instantiate new projects from project templates.

### Attachments

Upload, read, and delete file attachments on tasks.

### Organization Exports

Export organization-wide data. This is an Enterprise feature requiring Service Account authentication.

### SCIM (User Provisioning)

Provision and manage users programmatically using the SCIM protocol. Enterprise feature requiring Service Account authentication.

### Audit Logs

Access audit log events for organizational security and compliance monitoring. Enterprise feature requiring Service Account authentication.

## Events

Asana supports two event delivery mechanisms that share the same underlying infrastructure: webhooks (push-based) and an Events API (poll-based with sync tokens).

### Webhooks

Webhooks allow an application to be notified of changes in Asana. Webhooks allow you to subscribe to notifications about events that occur on Asana resources (e.g., tasks, projects, stories, etc.).

Webhooks can be subscribed to on any Asana resource (task, project, portfolio, team, workspace, goal). They require an initial handshake process using the `X-Hook-Secret` header to verify your endpoint is ready before sending events.

**Webhook Filters:** Filters support `resource_type` (e.g., "task", "story"), `resource_subtype` (e.g., "milestone"), `action` (e.g., "changed", "added"), and `fields` (specific field changes when action is "changed").

Webhooks created on team, portfolio, goal, or workspace must specify filters. For higher-level resources, the allowed filter combinations are more restricted:

- **Project events:** `added`, `removed` (on portfolios, teams, workspaces)
- **Team membership events:** `added`, `removed`
- **Goal events:** `added`, `removed`
- **Workspace membership events:** `added`, `removed`
- **Portfolio events:** `added`

For project-level and task-level webhooks, more granular events are available:

- **Task events:** `added`, `removed`, `changed` (with optional field-level filtering, e.g., `due_on`, `completed`, `assignee`, `dependencies`)
- **Story events:** `added`, `removed` (with optional subtype filtering, e.g., `comment_added`, `section_changed`)
- **Subtask events:** Changes to subtasks bubble up to parent resource subscriptions

### Events API (Polling)

An event is an object representing a change to a resource that was observed by an event subscription. Event streams rely on the same infrastructure as webhooks, which ensures events are delivered within a minute (on average). The Events API uses sync tokens to track position in the event stream. Events are retrievable from the event stream for 24 hours after being processed.

The Events API supports the same resource types and event types as webhooks and can be used as an alternative when maintaining a publicly accessible server is not feasible.
