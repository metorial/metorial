Let me get more details on the Leiga webhook events and API capabilities.Now let me check the webhook event list and the OAuth flow details.Now I have comprehensive information to write the specification.

# Slates Specification for Leiga

## Overview

Leiga is an AI-powered project management platform designed for development teams. It provides tools for issue tracking, sprint management, workflow automation, roadmaps, releases, and team collaboration, with integrations to tools like GitHub, GitLab, Jira, Slack, and IDEs.

## Authentication

Leiga supports two authentication methods, both based on a `clientId` and `secretKey` pair obtained from the Leiga application settings:

### 1. Permanent Token (API Key-style)

Best suited for server-to-server integrations. Obtain a long-lived access token by sending a POST request with your credentials:

- **Endpoint:** `POST https://app.leiga.com/openapi/api/authorize/access-permanent-token`
- **Body:** `{ "clientId": "xxx", "secretKey": "xxx" }`
- **Response:** Returns an `accessToken` with a 30-day expiry (`expireIn: 2592000` seconds).

The token is then passed in the `accessToken` header on subsequent API requests.

### 2. OAuth 2.0 (Access Token + Refresh Token)

Used for third-party application integrations where user authorization is needed:

- **Get Access Token:** `POST https://app.leiga.com/openapi/api/authorize/access-token`
  - Requires `clientId` and `secretKey` as parameters.
- **Refresh Access Token:** `POST https://app.leiga.com/openapi/api/authorize/refresh-token`
  - Used to refresh an expired access token.

The `clientId` and `secretKey` are generated in the Leiga application under **My Settings > Personal API Keys** or the system-level **OpenAPI** settings.

## Features

### Issue (Work Item) Management

Create, update, query, and delete issues (work items) within projects. Supports setting fields such as summary, description, type, priority, status, assignee, owner, start/due dates, story points, and custom fields. Also supports batch operations for creating, updating, and deleting issues. Issues can be filtered and queried using flexible filter criteria. Deleted issues can be viewed in a trash list and restored (paid plans only).

### Subtask Management

Add, update, and delete subtasks on issues. Subtasks have their own status, assignee, estimated points, time tracking, and due dates. Supports batch creation of subtasks.

### Issue Relations

Link issues to each other with relationship types (e.g., blocks, is blocked by). Add and remove relations between issues across projects.

### Sprint Management

Create, update, and delete sprints within projects. Retrieve sprint details and lists. Sprints include fields such as name, goal, start/end dates, assignee, and status.

### Epic Management

Create, update, and delete epics. Query epics with filter options. Associate issues with epics. Retrieve epic field definitions and details.

### Version / Release Management

Create, update, and delete versions (releases). Manage release lifecycle operations: release, cancel release, archive, and cancel archive. Associate and disassociate issues with versions. Retrieve version details and related issue lists.

### Project Management

Create new projects from templates, update project settings, and retrieve project information (by ID or project key). Manage project member roles and retrieve available project roles. List all projects and project templates.

### Organization and Member Management

List organization users, enable/disable users, and remove users from the organization. Manage project-level membership: add members, remove members, and change member roles.

### Comments

Add, update, and delete comments on issues. List comments for an issue. Support for comment stickers (reactions) — add and list stickers on comments.

### File Management

Upload, download, and delete files. List files associated with an entity. Bind files to issues or other objects.

### Workflow Management

Query project workflow definitions and retrieve available state transitions for issue statuses.

### Tag Management

Create, update, delete, and list tags within a project.

### Webhook Management

Programmatically create, update, delete, and query webhooks via the API. Retrieve available webhook types and subscribable event types.

### Personal Messages

Retrieve the authenticated user's personal message/notification list.

## Events

Leiga supports webhooks that send HTTP POST messages to a configured URL when project-level events occur. Webhooks are configured per project, and messages can use custom templates with Markdown or JSON formatting, supporting variable substitution for event data.

### Issue Events

- **Create Work:** Triggered when a new issue is created.
- **Update Work:** Triggered when an existing issue is updated (status changes, field edits, etc.).
- **Delete Work:** Triggered when an issue is deleted.
- Payload includes full issue information: summary, type, priority, status, assignee, project, sprint, release, custom fields, and time tracking data.

### Comment Events

- **Add Comment:** Triggered when a comment is added to an issue.
- **Update Comment:** Triggered when a comment is edited.
- **Delete Comment:** Triggered when a comment is removed.
- Payload includes the comment content, type (comment or reply), and the parent issue information.

### Attachment Events

- **Upload Attachment:** Triggered when a file is attached to an issue.
- **Delete Attachment:** Triggered when an attachment is removed.
- Payload includes attachment name, extension, and the parent issue information.

### Subtask Events

- **Add Subtask:** Triggered when a subtask is created on an issue.
- **Update Subtask:** Triggered when a subtask is modified.
- **Delete Subtask:** Triggered when a subtask is removed.
- Payload includes subtask details (summary, status, assignee, dates, estimates) and parent issue information.

### Linked Work Events

- **Add Linked Work:** Triggered when a relationship between issues is created.
- **Delete Linked Work:** Triggered when a relationship between issues is removed.
- Payload includes the source issue, destination issues, and relationship type.

### Sprint Events

- **Create Sprint:** Triggered when a new sprint is created.
- **Start / Restart Sprint:** Triggered when a sprint is started or restarted.
- **Complete Sprint:** Triggered when a sprint is completed.
- **Delete Sprint:** Triggered when a sprint is deleted.
- Payload includes sprint name, goal, dates, assignee, status, and associated project.
