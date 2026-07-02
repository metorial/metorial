Let me fetch the full API documentation to understand all available features.Now let me note that "Nozbe Teams" is specifically the Nozbe product (now rebranded to just "Nozbe"), not Microsoft Teams. The search results about Microsoft Teams webhooks are irrelevant. Let me check the Nozbe API documentation more closely for available endpoints.The page didn't render the actual API.md content. Let me fetch the raw version.Now I have enough information. Note that Nozbe Teams has been rebranded to just "Nozbe" but the API remains the same. There are two APIs to consider: the older JavaScript wrapper (`@nozbe/teams-api`) and the newer REST API at `api4.nozbe.com`. The REST API is the current one. Let me check if there's any webhook support from Nozbe itself.

Based on my research, Nozbe Teams does not appear to offer native webhook or event subscription capabilities through its API. The Zapier triggers are polling-based, not webhook-based.

# Slates Specification for Nozbe Teams

## Overview

Nozbe Teams (now rebranded as Nozbe) is a collaborative task and project management application for teams. It offers features like task management, project tracking, communication tools, and integration with popular apps. The API allows programmatic management of projects, tasks, comments, tags, and team members.

## Authentication

Nozbe Teams uses **API token** authentication.

To generate your API token, hit the gear icon → Settings → API tokens and click "Add new token." You can name each token for organizational purposes and generate multiple tokens for different integrations.

By default, the API tokens you add will give access only to the space you're creating them in. If you want to add a token that gives access to all of your spaces, toggle the "Add it as a global token" option.

Each endpoint requires the API token to be provided as the Authorization header.

**Base URL:** `https://api4.nozbe.com/v1/api`

**Header format:**

```
Authorization: <API_TOKEN>
```

Example request:

```
curl -X 'GET' \
  'https://api4.nozbe.com/v1/api/projects' \
  -H 'accept: application/json' \
  -H 'Authorization: <API_TOKEN>'
```

## Features

### Project Management

Create, read, update, and manage projects within your Nozbe Teams spaces. You can fetch all projects, add new projects, and update existing projects. Projects can be configured with attributes such as name, purpose/description, color, member access (open to all space members, invite-only, or private), and favorite status. Adding new projects is available for paid accounts only. Projects can be organized into groups and divided into sections.

### Task Management

You can create, read, update, and delete tasks. Tasks support a rich set of parameters including:

- Assignment to a specific project and section
- Responsibility (assigning to a team member)
- Due dates and recurrence
- Priority status
- Tags
- Time needed and time spent tracking
- Reminders
- Completion and abandonment states

Results can be filtered by various task attributes such as project ID, due dates, priority, completion status, and more.

### Comments and Attachments

You can add comments to tasks with text content. Nozbe Teams renders comments in Markdown. You can also add comments with file attachments to a particular task. Comments can be updated (text modified) or deleted. Comments support pinning within tasks.

### Tags

Manage tags that categorize tasks across projects. Tags are used to categorize tasks by places or tools required for task completion. You can use them to group various tasks and do them in bundles unrelated to the project but related to a particular aspect. Tags can be configured with custom names, colors, and icons, and can be set as public (visible to space members) or private.

### Team Management

Retrieve information about teams and team members within your Nozbe Teams account. This includes viewing team member details and their roles within spaces.

### Generic Record Operations

The API supports creating arbitrary records in particular collections (tasks, projects, etc.). Similarly, you can update and remove records in any collection by ID, enabling access to features that may not be explicitly documented through higher-level endpoints.

### Filtering, Field Selection, and Sorting

Results can be filtered by query parameters using LHS brackets with operators such as `min`, `max`, `ne` (not equal), and equality checks. You can limit which fields are returned in responses using the `fields` parameter. Results can be sorted by multiple fields in ascending or descending order.

## Events

The provider does not support events. Nozbe Teams does not offer native webhook or event subscription mechanisms through its API. There is no built-in way to receive push notifications or subscribe to changes on resources.
