Now let me get more details on the API methods/features and OAuth scopes.Now let me get the webhook event types to complete the specification.Now I have comprehensive information to write the specification. Let me compile everything.

# Slates Specification for Wrike

## Overview

Wrike is a cloud-based work management and project management platform. It provides tools for managing tasks, projects, folders, time tracking, approvals, workflows, and team collaboration. The API (v4) is RESTful and allows programmatic access to all core Wrike data and functionality.

## Authentication

Wrike supports two authentication methods:

### 1. OAuth 2.0 (Authorization Code Flow)

This is the recommended method for production applications, especially those used by multiple users.

**Setup:**

- Register an application in the Wrike App Console (under Apps & Integrations → API tab) to obtain a **Client ID** and **Client Secret**.
- Configure one or more **Redirect URIs** (must use HTTPS; `https://localhost` is allowed for development).

**Flow:**

1. **Authorization Request:** Redirect users to:

   ```
   https://login.wrike.com/oauth2/authorize/v4?client_id=<client_id>&response_type=code
   ```

   Optional parameters: `redirect_uri`, `state`, `scope`.

2. **Authorization Code:** After user consent, Wrike redirects back with an authorization `code` (valid for 10 minutes).

3. **Token Exchange:** POST to `https://login.wrike.com/oauth2/token` with parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `code`.

4. **Response** includes: `access_token`, `refresh_token`, `token_type` (bearer), `expires_in` (3600 seconds), and crucially a `host` parameter (e.g., `www.wrike.com`).

5. **Using the token:** All subsequent API requests must use the base URL `https://<host>/api/v4` and include the token via `Authorization: bearer <access_token>` header.

6. **Refreshing:** POST to `https://login.wrike.com/oauth2/token` with `grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token`. Returns a new access/refresh token pair.

**Important:** Wrike stores customer data in multiple data centers (US and EU). The `host` parameter returned during token exchange determines the correct base URL and must be used for all API requests.

**Scopes:** Scopes can be requested during authorization to control access granularity. Supported scopes include: `Default`, `wsReadOnly`, `wsReadWrite`, `amReadOnlyWorkflow`, `amReadWriteWorkflow`, `amReadOnlyInvitation`, `amReadWriteInvitation`, `amReadOnlyGroup`, and others. Each API method specifies which scopes it requires.

### 2. Permanent Access Token

A non-expiring token that can be generated from the Wrike App Console for a registered application. This is suitable for personal integrations, testing, or applications used by a single user. The token grants the same permissions as the user who created it. It is shown only once upon creation and should be stored securely. The correct base URL must be determined by the user's Wrike instance URL.

## Features

### Task Management

Create, read, update, and delete tasks within folders or projects. Supports setting titles, descriptions, importance, status, dates (start, due, duration), assignees (responsibles), custom fields, and parent folders/projects. Task field history can also be queried. Bulk updates are supported for multiple tasks at once.

### Folder & Project Management

Manage folders and projects, which form the hierarchical organizational structure in Wrike. Projects are folders with additional properties: owners, start/end dates, and status. Supports creating, copying (including async copy), modifying, and deleting folders/projects. The full folder tree can be retrieved for navigation.

### Spaces

Manage spaces, which are top-level organizational containers in Wrike. Spaces can be queried and used as scoping targets for other operations like webhooks.

### Comments

Add, read, and delete comments on tasks, folders, and projects.

### Attachments

Upload, download, and manage file attachments on tasks, folders, and projects.

### Time Tracking

Log time entries (timelogs) against tasks. Manage timelog categories and timelog lock periods. Query and manage timesheets, timesheet rows, and timesheet submission rules.

### Custom Fields

Create, read, and modify custom fields at the account or space level. Custom fields can be applied to tasks, folders, and projects to capture additional structured data.

### Custom Item Types

Define and manage custom item types (CITs) to create specialized work item categories beyond standard tasks and projects.

### Workflows

Create and modify workflows that define the set of statuses available for tasks and projects. Each workflow contains custom statuses with configurable properties.

### Users & Contacts

Query user and contact information within the account. Manage invitations to invite new users. Manage user types and groups for organizing users.

### Approvals

Manage approval processes on tasks, folders, and projects. Supports tracking approval status and individual approver decisions.

### Dependencies

Create and manage task dependencies (predecessor/successor relationships) for timeline/Gantt chart views.

### Blueprints

Use task blueprints and folder blueprints as templates for creating standardized work items.

### Work Schedules

Manage work schedules and work schedule exceptions to define working days and hours. User-level schedule exceptions are also supported.

### Bookings & Resource Management

Manage bookings for resource allocation. Supports hourly rates and job roles for resource planning and cost tracking.

### Account Administration

Query and modify account-level settings. Manage access roles and user types to control permissions.

### Audit Log

Access audit log data for security information and event management (SIEM) integration.

### Data Export (BI Export)

Export account data in a relational table format for import into third-party analytics tools (e.g., Tableau, Power BI).

### EDiscovery

Access eDiscovery functionality for compliance and legal purposes.

## Events

Wrike supports webhooks for receiving real-time notifications about changes. Webhooks can be scoped to three levels: **folder/project** (with optional recursive mode for subfolders), **space**, or **account-wide**.

When creating a webhook, you can optionally specify which event types to subscribe to, filter by Custom Item Types, and use parameterized events for granular filtering (e.g., only fire when a specific custom field changes). Payloads can be enriched with additional contextual fields (e.g., title, status, custom fields) to reduce the need for follow-up API calls.

Webhooks support payload signing with a shared secret for authenticity verification. Webhooks are automatically suspended if the endpoint becomes unreachable after retries.

### Task Events

Notifications about task lifecycle and property changes:

- **TaskCreated** — New task created (can filter for recurrent vs. non-recurrent).
- **TaskDeleted** — Task deleted.
- **TaskTitleChanged** — Task title updated (includes old/new values).
- **TaskImportanceChanged** — Task importance/priority changed.
- **TaskStatusChanged** — Task workflow status changed (includes old/new status and custom status IDs).
- **TaskDatesChanged** — Task start/due dates or duration changed.
- **TaskDescriptionChanged** — Task description changed (delivered with ~5-minute delay).
- **TaskParentsAdded / TaskParentsRemoved** — Task added to or removed from a folder/project/space.
- **TaskResponsiblesAdded / TaskResponsiblesRemoved** — Assignees added or removed.
- **TaskSharedsAdded / TaskSharedsRemoved** — Task shared or unshared with users.
- **TaskCustomFieldChanged** — Custom field value changed on a task (can filter to specific custom fields via parameterized events).

### Folder & Project Events

Notifications about folder and project lifecycle and property changes:

- **FolderCreated / FolderDeleted** — Folder, project, or space created or deleted.
- **FolderTitleChanged** — Title changed (includes old/new values).
- **FolderDescriptionChanged** — Description changed.
- **FolderParentsAdded / FolderParentsRemoved** — Folder/project moved within the hierarchy.
- **FolderSharedsAdded / FolderSharedsRemoved** — Folder/project shared or unshared.
- **FolderCommentAdded / FolderCommentDeleted** — Comment added or removed on a folder/project.
- **FolderAttachmentAdded / FolderAttachmentDeleted** — Attachment added or removed on a folder/project.
- **FolderCustomFieldChanged** — Custom field value changed on a folder/project (can filter to specific custom fields).
- **ProjectDatesChanged** — Project start/end dates changed.
- **ProjectOwnersAdded / ProjectOwnersRemoved** — Project owners assigned or unassigned.
- **ProjectStatusChanged** — Project status changed.

### Approval Events

Notifications about approval workflow changes:

- **TaskApprovalStatusChanged / FolderApprovalStatusChanged** — Approval status changed.
- **TaskApprovalDecisionChanged / FolderApprovalDecisionChanged** — Approver decision made.
- **TaskApprovalDecisionReset / FolderApprovalDecisionReset** — Approval decision reset (e.g., after file re-upload).

### Attachment & Comment Events (on Tasks)

- **AttachmentAdded / AttachmentDeleted** — Attachment added or removed from a task.
- **CommentAdded / CommentDeleted** — Comment added or removed on a task.

### Time Tracking Events

- **TimelogChanged** — Time log entry added, updated, or removed.

### Other Events

- **WorkItemTypeChanged** — A work item's Custom Item Type changed (e.g., plain task converted to a CIT).
- **CreateFromBlueprintCompleted** — Creation from a blueprint template completed.
- **ImportFromFileCompleted** — Import from an Excel or MS Project file completed.
