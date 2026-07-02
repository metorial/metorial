Now let me get more details on the API features:# Slates Specification for Process Street

## Overview

Process Street is a process management platform that allows teams to create, manage, and run structured workflows (checklists) built from templates. It supports task management, approvals, form data collection, and data sets for organizing structured records.

## Authentication

Process Street offers a single form of authentication: the API is HTTPS-only and authentication is based on API keys.

Each API key is associated with an individual organization in Process Street and can be managed from the **Integrations** tab in the organization settings area. You must be an administrator to manage API keys.

The API key is passed via the `X-API-KEY` header in each request:

```
X-API-KEY: <your_api_key>
```

You must be on the Enterprise plan to use the API.

**Base URL:** `https://public-api.process.st` (for the data extraction API) or `https://api.process.st/api/v1` (for the workflow management API).

**Note:** Process Street recently renamed some of its domain entities. The endpoints and resources in the API match the old naming conventions and may not match names seen in the application or help sites. For example, "checklists" in the API correspond to "workflow runs" in the UI, and "templates" correspond to "workflows."

## Features

### Workflow Run Management

Create, retrieve, update, and delete workflow runs (referred to as "checklists" in the API). You can set the name and due date for a new workflow run and toggle the workflow run share link on or off. You can populate form fields with data, check and uncheck subtasks, change the status of a workflow run (active, complete, archived), and change the name or due date.

- Workflow runs are created from a specific workflow (template).
- Runs can be deleted and un-deleted.

### Task Management

Manage individual tasks within a workflow run. You can list tasks, get task details (name, status, due date), complete tasks, set task due dates, and assign or unassign users or groups to tasks.

- You can retrieve a list of approvals for a workflow run. Approvals are special tasks used to approve or reject another task.
- Tasks that contain required form fields cannot be completed via the API until those fields are filled.

### Form Field Management

Read and update form field values within workflow runs. You can list all form field values for an entire workflow run or for a specific task, and update multiple form field values at once.

- Values can be simple strings, arrays, or objects with multiple properties depending on the field type.

### Data Set Management

Manage structured data records in data sets. You can list data sets, list records, create records, get individual records, update records, and delete records.

### Webhook Management

Create and delete outgoing webhooks programmatically via the API.

## Events

Process Street supports outgoing webhooks that send event-driven notifications to external services. You must be an Administrator to set up webhooks. You can define up to 50 webhooks. Webhooks are configured per specific workflow, form, or data set.

### Workflow Events

Events related to workflow runs and their tasks:

- **Task checked/unchecked** — Fires when a task is completed or uncompleted.
- **Workflow run created** — Fires when a new workflow run is started.
- **Workflow run completed** — Fires when a workflow run is fully completed.
- **Task ready** — Fires when a task becomes ready to be checked (e.g., when a run starts, a task is shown by conditional logic, a task is unstopped, or a task becomes approvable).
- **Task not ready** — Fires when a task is no longer ready to be checked.
- **Task approved** — Fires when an approval task is approved.
- **Task rejected** — Fires when an approval task is rejected.
- **Task overdue** — Fires when a task passes its due date.

### Form Events

- **Form response completed** — Fires when a form response is submitted.

### Data Set Events

Events related to data set records:

- **Record added** — Fires when a new record is added to a data set.
- **Record updated** — Fires when a record is modified in a data set.
- **Record deleted** — Fires when a record is removed from a data set.

### Incoming Webhooks (Webhook Triggers)

You can use incoming webhooks (webhook triggers) to run a workflow automatically when something happens in another app. Process Street provides a unique webhook URL that external services can POST to, which triggers a new workflow run and maps incoming payload fields to form fields in the workflow. Data set records can also be created via incoming webhooks.
