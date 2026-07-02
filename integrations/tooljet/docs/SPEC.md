# Slates Specification for ToolJet

## Overview

ToolJet is an open-source low-code platform for building internal tools, dashboards, and business applications. It provides a visual app builder with drag-and-drop UI components, a built-in PostgreSQL-based database (ToolJet Database), workflow automation, and connections to 80+ data sources including databases, APIs, and SaaS tools. It can be self-hosted or used via ToolJet Cloud.

## Authentication

ToolJet uses a static access token for API authentication. By default, the ToolJet API is disabled. To enable the API, you must set environment variables: `ENABLE_EXTERNAL_API=true` and `EXTERNAL_API_ACCESS_TOKEN=<access_token>` in the `.env` file. The access token is created by you.

You need to pass the access token in the `Authorization` header to authenticate your requests. The access token should be sent in the format `Basic <access_token>`.

Example:

```
Authorization: Basic <access_token>
```

The base URL for all API requests is `https://{your-tooljet-instance.com}/api/ext/`.

**Note:** The ToolJet API is a paid feature available on self-hosted instances. The access token is not an OAuth token or API key generated through a UI — it is a static value configured directly in the server environment.

For webhook-triggered workflows, a separate authentication mechanism is used. Authentication is mandatory for webhooks. Use a bearer token in the Authorization header: `Authorization: Bearer <secret_token>`. Each workflow has its own unique endpoint URL and API token, which can be found in the workflow's Triggers tab.

## Features

### User Management

Programmatically manage users on the ToolJet instance. The API allows you to interact with the ToolJet platform programmatically to manage users and their workspace relations. You can:

- List all users with their workspace permissions and group memberships, with optional filtering by group names.
- Look up a specific user by UUID or email address.
- Create new users with name, email, password, status (active/archived), and workspace assignments including group memberships.
- Update user details such as name, email, password, and status.
- Update a user's role within a specific workspace.

### Workspace Management

Retrieve information about all workspaces on the instance, including their status and associated groups. You can also manage user-workspace relationships:

- Replace all workspace relations for a user (or remove all by sending an empty array).
- Update a specific workspace relation for a user, including status and group assignments.

### Application Export and Import

Move applications between ToolJet instances or workspaces. Export a ToolJet application from a specified workspace, including pages, queries, data sources, environments, versions, and metadata.

- **Export:** Supports options to include/exclude ToolJet Database data (`exportTJDB`), export a specific app version (`appVersion`), or export all versions (`exportAllVersions`).
- **Import:** Import an application JSON into a workspace, optionally specifying a custom app name.

### Workflow Triggering via Webhooks

ToolJet Workflows enable users to create complex, data-centric automations using a visual, node-based interface. It extends ToolJet's capabilities beyond building user interfaces, allowing developers and business users to automate processes, integrate data from various sources, and execute custom logic.

- ToolJet supports webhook triggers that allow you to run a workflow when a webhook is received.
- You can choose the environment (e.g., development, staging, production) to modify the webhook endpoint URL.
- Parameters can be passed to workflows via the request body, with defined parameter names and types.
- The webhook endpoint format is: `{TOOLJET_HOST}/api/v2/webhooks/workflows/:id/trigger`

## Events

ToolJet's API does not provide outbound webhook subscriptions or event notification mechanisms for listening to platform changes (e.g., user created, app deployed). ToolJet supports webhook and manual triggers, but these are _inbound_ — they allow external systems to trigger ToolJet workflows, not for ToolJet to notify external systems of events.

The provider does not support events.
