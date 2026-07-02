Now I can see that "Project Bubble" is also known as "ProProfs Project" — it's a project management tool. Let me find more details about its API.Now let me get the full API documentation from the Project Bubble help site.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Project Bubble

## Overview

Project Bubble (now known as ProProfs Project) is a project management and collaboration platform designed for small to mid-sized teams. It provides a visual interface for managing projects, tasks, time tracking, file sharing, and team collaboration. It offers a RESTful API (v2) that returns responses in JSON format, with support for CSV and HTML output.

## Authentication

Project Bubble uses API key authentication. To authenticate, you need your API key (found on the My Account page) and your account domain. Both must be sent as HTTP headers with every request.

Required headers:

- `key`: Your API key from the My Account page
- `domain`: Your Project Bubble domain (e.g., `mydomain.projectbubble.com`)

The base URL for all API requests is `https://api.projectbubble.com/v2/`.

Example:

```
curl -H "key:YOUR_API_KEY" -H "domain: mydomain.projectbubble.com" https://api.projectbubble.com/v2/user
```

There is no OAuth or token-based authentication; the API key and domain header combination is the only supported method.

## Features

### Company & User Management

Retrieve company details, users, and teams. Allows reading organizational data including company settings, user profiles, and team membership.

### Project Management

Create and manage projects. Projects serve as the top-level container for organizing tasks, files, and collaboration.

### Task Management

Full task lifecycle management including task lists, subtasks. Tasks can be created, updated, retrieved, and organized within projects. Subtasks allow for breaking work into smaller units.

- Tasks and subtasks can be marked as completed.

### Time Tracking

Track time, budget, and resources. Time entries can be managed via the API, allowing logging and retrieval of time spent on tasks.

### Comments

Create, retrieve, and delete comments. Comments facilitate collaboration on tasks and projects.

### File Management

Share and manage files within projects. The Files API enables access to files attached to projects.

### Calendar Events

Manage calendar events. The Events API allows reading and managing calendar events within Project Bubble.

### Client Management

Manage client records and contacts. Clients can be associated with projects, and contact information can be managed through dedicated API resources.

## Events

Project Bubble supports webhooks (REST Notification Hooks) that notify your application when specific events occur, along with a resource URL to fetch the new data via the API.

To subscribe to a webhook, send a POST request to `https://api.projectbubble.com/v2/hooks` with a `target_url` and `event` name. Events are tied to the subscribed user's API key — only actions performed by that user will trigger notifications.

Project Bubble does not include authentication when sending webhook notifications. It is recommended to use long, complex unique identifiers as target URLs.

### Supported webhook events:

The following events are available:

- **New Project** (`new_project`): Triggered when a new project is created.
- **New Task** (`new_task`): Triggered when a new task is created.
- **Completed Task** (`completed_task`): Triggered when a task is marked as completed.
- **New Subtask** (`new_subtask`): Triggered when a new subtask is created.
- **Completed Subtask** (`completed_subtask`): Triggered when a subtask is marked as completed.
- **New Event** (`new_event`): Triggered when a new calendar event is added.
- **New Client** (`new_client`): Triggered when a new client is created.
