# ClickUp Integration Specification

## Overview

ClickUp is a project management and productivity platform that organizes tasks within Workspaces, Spaces, Folders, and Lists. This integration exposes task management, comments, checklists, existing custom-field values, hierarchy management, Goals, Space tags, time tracking, Workspace members, and event triggers. One connection can access every Workspace authorized for its account.

## Authentication

ClickUp supports two authentication methods:

### 1. Personal API Token

For individual or internal use. Any ClickUp user can generate a personal token from their account settings (Settings > Apps > Generate API Token). The token grants the same access level as the user's browser session across all Workspaces they belong to. Include it in the `Authorization` header of every request:

```
Authorization: pk_12345678_ABCDEFGHIJKLMNOP
```

Personal tokens do not expire.

### 2. OAuth 2.0 (Authorization Code Grant)

Required for apps or integrations used by multiple users. A Workspace owner or admin must create an OAuth app in ClickUp (Settings > ClickUp API > Create an App) to obtain a `client_id` and `client_secret`.

**Flow:**

1. Redirect users to the authorization URL:
   ```
   https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}
   ```
   An optional `state` parameter can be included.
2. The user authorizes one or more Workspaces and is redirected back with an authorization `code`.
3. Exchange the `code` for an access token via the Get Access Token endpoint, providing `client_id`, `client_secret`, and `code`.
4. Use the access token in the `Authorization` header:
   ```
   Authorization: Bearer {access_token}
   ```

OAuth access tokens currently do not expire. Each user gets an individualized token scoped to the Workspaces they authorized. ClickUp's OAuth does not use granular scopes — the token inherits the permissions of the authorizing user's account.

## Multi-Workspace Behavior

The connection is account-scoped rather than tied to one preset Workspace. `get_workspaces` discovers the Workspace IDs authorized for the connection. Tools that call Workspace-scoped ClickUp endpoints require an explicit `workspaceId`, allowing each request to select its target Workspace. This applies to Workspace members, Spaces, Goals, task search, time entries, and timers, including task searches narrowed by `listId`. Tools that operate on an existing resource ID continue to use that resource ID directly.

Webhook triggers register once in every authorized Workspace. Registration retains the Workspace-to-webhook mapping so emitted task and Workspace events identify their source Workspace, and cleanup removes every registered webhook.

## Features

### Workspace & Hierarchy Management

Discover authorized Workspaces and create, retrieve, update, and delete Spaces, Folders, and Lists within them. Users call `get_workspaces` to discover authorized Workspace IDs, then pass the selected `workspaceId` to Workspace-scoped tools.

### Task Management

Create, retrieve, update, delete, and search tasks within Lists or across a selected Workspace. Tasks support names, descriptions, assignees, statuses, priorities, due dates, start dates, time estimates, tags, custom-field values, and subtasks.

### Existing Custom Field Values

Set or clear values on existing custom fields on tasks. List the fields accessible on a List to discover the required field IDs and available options.

### Comments & Checklists

Create, retrieve, update, and delete task comments. Create, update, and delete task checklists and checklist items.

### Goals

Create, retrieve, update, and delete Goals in a selected Workspace.

### Time Tracking

Track time on tasks by creating, updating, deleting, and querying time entries. Start and stop timers and retrieve the currently running timer. Requires the Time Tracking ClickApp to be enabled by a Workspace admin.

### Tags

Create, update, and delete tags at the Space level and apply or remove them from tasks.

### Workspace Members

Retrieve members of a selected Workspace, including available user IDs, names, email addresses, roles, and profile pictures.

### Task Filtering & Search

Query and filter tasks by status, assignee, tags, due dates, creation dates, update dates, Space, or List.

## Events

The integration's task and Workspace event triggers create a webhook in every Workspace authorized for the connection. Emitted events include the source `workspaceId`, and removing a trigger cleans up every webhook registered for it.

### Task Events

Covers the full lifecycle and updates to tasks:

- Task created, updated, deleted
- Priority, status, assignee, due date, and tag changes
- Task moved to a new List
- Comment posted or updated on a task
- Time estimate updated
- Time tracked added, updated, or deleted

### List Events

Covers creation, update, and deletion of Lists.

### Folder Events

Covers creation, update, and deletion of Folders.

### Space Events

Covers creation, update, and deletion of Spaces.

### Goal Events

Covers creation, update, and deletion of Goals.
