Now I have a good understanding of the Retool API. Let me also check for any webhook/event support from Retool's API side (not just workflows receiving webhooks, but Retool sending outbound events).Based on my research, Retool does not have outbound webhook/event subscription support through its API. It only supports inbound webhooks to trigger workflows. Let me now compile the specification.

# Slates Specification for Retool

## Overview

Retool is a low-code platform for building internal tools, offering a drag-and-drop app builder, workflow automation, mobile apps, and a built-in database. The Retool API allows programmatic management of the Retool organization itself — including users, groups, apps, resources, permissions, workflows, and configuration — rather than the internal tools built on top of it.

## Authentication

Retool uses **Bearer token (access token)** authentication for its API.

The Retool API uses access tokens to authenticate requests. Organization admins can create access tokens from their organization's Settings > API page by clicking "Create new" to generate an access token.

Tokens are passed via the `Authorization` header:

```
Authorization: Bearer <ACCESS_TOKEN>
```

The base URL for the API depends on hosting type. For cloud-hosted organizations: `https://api.retool.com/api/v2/`. For self-hosted organizations: `https://retool.example.com/api/v2/`.

If the organization uses Spaces, each space has its own authentication tokens and API endpoints. Only tokens created for a space can be used with its endpoints, with one exception: an admin can use a token from the primary organization to interact with a space's endpoints if they are also an admin for that space.

The Retool API is available on Business or Enterprise plans, with each plan tier providing increasing levels of API access. The Business plan provides limited access (User Invites, User Attributes, Custom Component Library), while Enterprise plans unlock progressively more endpoint groups.

## Features

### User Management

Manage users within a Retool organization. Create, list, update, and delete users. Supports programmatic user onboarding and offboarding. Includes managing user attributes (custom key-value metadata on users) and user invitations.

- Available on Enterprise Premium plan for full user management; User Invites and User Attributes are available on Business plan.

### Group Management

Manage permission groups within the organization. Create, update, delete groups, and manage group membership (adding/removing users from groups).

- Groups are the primary mechanism for assigning permissions in Retool.

### App Management

Manage Retool applications programmatically. List, create, update, and delete apps. Useful for automating app lifecycle management across environments.

- Available on Enterprise Premium plan only.

### Folder Management

Organize apps using folders. Create, list, and manage folder structures for organizing applications.

### Spaces Management

Manage Spaces, which are isolated sub-environments within a Retool organization. Create and configure Spaces programmatically, useful for multi-tenant or multi-team setups.

### Permissions Management

Control access to apps and folders. View and modify access control lists that determine which users and groups can access specific apps or folders.

- Available on Enterprise Premium plan only.

### SSO Configuration

Programmatically configure single sign-on settings for the organization.

- Available on Enterprise Premium plan only.

### Resource and Environment Management

Manage data source resources (database connections, API configurations) and environments (e.g., staging, production). Also manage resource configurations per environment and configuration variables used across resources.

- Available on Enterprise Premium plan only.

### Source Control

Manage source control configuration for the organization, enabling integration with Git-based version control systems.

- Available on Enterprise Base plan and above.

### App Themes

Manage custom app themes for consistent styling across Retool applications.

### Workflow Management

List workflows and retrieve workflow run details, allowing monitoring of automated workflow executions.

- Workflow listing is available on Enterprise Premium; run details are available on Enterprise Base and above.

### Custom Component Libraries

Manage custom component libraries that extend Retool's built-in component set.

- Available on Business plan and above.

### Observability

Configure observability providers for monitoring and logging within the organization.

- Available on Enterprise Premium plan only.

### Usage Analytics

Access usage data and analytics for the organization, including listing organizations.

- Available on Enterprise Premium plan only.

### Access Tokens Management

List and manage API access tokens for the organization.

### User Tasks

List and manage user tasks within the organization.

## Events

The provider does not support outbound webhooks or event subscriptions. Retool Workflows can receive inbound webhooks from external services, but the Retool API itself does not offer a mechanism to subscribe to events or receive notifications about changes within the Retool organization.
