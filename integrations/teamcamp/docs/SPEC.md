The search returned results for Microsoft Teams, not Teamcamp. Let me check the Teamcamp API docs more thoroughly for webhook/event support.# Slates Specification for Teamcamp

## Overview

Teamcamp is a project management platform for managing projects, tasks, team collaboration, time tracking, invoicing, and client portals. The Teamcamp API provides access to task, project, and team management functionalities programmatically. The API is currently in beta.

## Authentication

Teamcamp uses API key authentication. All requests must include an `apiKey` header with a valid API key.

- **Method:** API Key via HTTP header
- **Header name:** `apiKey`
- **Base URL:** `https://api.teamcamp.app`
- **Obtaining the key:** Generate your API key from your [Teamcamp Account Settings](https://dash.teamcamp.app/settings/apikey).
- **Verification:** You can verify a valid API key by calling `GET /v1.0/verify`.

Example request header:

```
apiKey: your-api-key-here
```

The API is built on REST principles and is served over HTTPS. Unencrypted HTTP is not supported.

## Features

### Workspace User & Customer Management

Retrieve information about workspace users and customers. Users include details such as email, admin/owner status. Customers include contact details (name, email, phone, address, company name) and associated client contacts.

- Users and customers are read-only through the API; they cannot be created or modified via the API.

### Project Management

Create, read, update, and delete projects within a workspace. Projects can be associated with a customer and configured with start and due dates.

- Projects can be created from templates by providing a `templateId`.
- Projects belong to a workspace and include metadata such as owner, associated users, and favorite users.
- You can retrieve project lists, individual projects, and detailed project information including project groups.

### Project Groups

Retrieve the list of project groups (task groupings within a project). Groups help organize tasks within a project.

- Project groups are read-only through the API.

### Task Management

Create, read, and update tasks within projects. Tasks support assignment to multiple users, priority levels, due dates, estimated time, milestones, statuses, file attachments, and grouping.

- **Priority levels:** No Priority (0), Urgent (1), High (2), Medium (3), Low (4).
- Tasks can be assigned to multiple users via `taskUsers`.
- File attachments can be included at creation time with file type, URL, name, and size.
- Tasks can be linked to milestones and custom statuses.
- Task deletion is not available through the API.

### Task Comments

Post comments on tasks by specifying a task ID and comment content.

- Comments are write-only; there is no API endpoint to retrieve existing comments.

## Events

The provider does not support events. The Teamcamp API does not offer webhooks, event subscriptions, or any built-in polling mechanism for change notifications.
