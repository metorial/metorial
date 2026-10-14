# Worksnaps API Specification

## Overview

Worksnaps is a time tracking service designed for remote teams. It automatically captures screenshots, mouse/keyboard activity, and active applications at regular intervals ("work snaps") to verify work. The platform supports organizing work into projects and tasks with role-based access control.

## Authentication

Every user has an API token and authentication is managed using HTTP basic authentication. In each request the API token has to be included as the username and the password is ignored (that is, only the API token is used for authenticating API requests).

**How to obtain the API token:**
The API token authenticates via Basic auth. Generate the token from your Worksnaps account settings by navigating to **Profile & Settings** >> **Web Service API**.

**Usage:** Include the API token as the username in HTTP Basic Authentication headers. The password field is ignored but must be present (any value is accepted, e.g., "ignored").

Example:

```
curl -u YOUR_API_TOKEN:ignored https://api.worksnaps.com/api/...
```

**Partner API Token:** Your Worksnaps subscription includes API access for all accounts (including free and trial accounts). However, some privileged operations (such as user creation) require a partner API token, which is established out-of-band as a secret between Worksnaps and a partner organization.

**Base URL:** `https://api.worksnaps.com/api`

## Features

### Project Management

Create, retrieve, update, and archive projects. You can easily manage your team by putting users into different projects. Each user can only access the projects they are assigned to, while as a project manager you can view and control everything.

### Task Management

Create new tasks in a specified project, and delete tasks from a project. Tasks can also be updated and retrieved individually or listed per project. Tasks allow teams to organize work within projects at a more granular level.

### Time Entry Tracking

Retrieve time entries logged against projects. Time entries can be filtered by user and by date range (using timestamps). The time logged consists of a sequence of "work snaps". Each work snap represents 10 minutes of work which can be verified by a screenshot, mouse and keyboard volume and most active applications used during each interval. You can also retrieve the full-resolution screenshot URL associated with a time entry. Create offline time entries for yourself or, as a project manager, another user. Update task associations or comments and remove one or more time entries by ID.

### User Account Management

Retrieve information about a specific user account, retrieve a list of all user assignments for the authenticated user, and retrieve a list of all users. The current-user endpoint provides connection identity. User account information can be updated by the user themselves or a trusted partner.

### User Assignments

Manage which users are assigned to which projects. Retrieve users assigned to a specific project or get a specific user's assignment within a project.

### Task Assignments

Retrieve task assignments within a project, showing which users are assigned to which tasks.

### Project Reporting

Retrieve a project's time tracking report. Reports can be generated for a specific project filtered by date range and user IDs, useful for billing, payroll, and productivity analysis.

## Events

This integration exposes tools only.

## API Sources

- [API overview and authentication](https://api.worksnaps.com/api_docs/api_overview.html)
- [Official Swagger API specification](https://api.worksnaps.com/api_docs/worksnaps.json)
- [API token setup](https://api.worksnaps.com/api_docs/api_token.html)
