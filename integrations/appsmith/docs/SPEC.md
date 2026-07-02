I notice the search results are mostly about Appsmith as a platform for building apps and connecting to external APIs — not about Appsmith's own management/admin API. Let me search specifically for Appsmith's server-side API that would allow external systems to manage Appsmith resources programmatically.Based on my research, I now have a good understanding of Appsmith and its capabilities. Appsmith is primarily a low-code platform — it doesn't expose a comprehensive, documented public REST API for external integrations to manage its resources programmatically. Its internal APIs (for managing applications, workspaces, etc.) are used by its own frontend and are not officially documented for third-party consumption. Let me compile the specification based on what is available.

# Slates Specification for Appsmith

## Overview

Appsmith is an open-source low-code platform for building internal tools, admin panels, dashboards, and workflows. It provides a drag-and-drop UI builder, connects to 25+ databases and any REST/GraphQL API, and allows writing JavaScript for business logic. It can be used via Appsmith Cloud or self-hosted on your own infrastructure.

## Authentication

Appsmith does not provide a formally documented public API with standard API key or OAuth-based authentication for third-party integrations. Its internal server APIs (under `/api/v1/`) are used by the Appsmith frontend and are session/cookie-based:

- **Session-based authentication**: Users authenticate via the Appsmith login page (email/password, or SSO), and a session cookie is used for subsequent API requests. There is no officially supported mechanism to generate API keys or personal access tokens for programmatic access to Appsmith's management APIs.

- **Instance-level SSO options**: Appsmith instances can be configured to use Google OAuth, GitHub OAuth, OpenID Connect (OIDC), or SAML for user login. These are for authenticating users into Appsmith itself, not for external API access.

- **Unauthenticated monitoring endpoints**: The Health Check API (`GET /api/v1/health`) and Application Performance API (`GET /api/v1/consolidated-api/view`) do not require authentication.

- **Workflow Webhook URLs**: When using Appsmith Workflows (Business/Enterprise), each workflow can expose a unique webhook URL that external systems can call via a POST request without separate authentication — the URL itself acts as the credential.

**Note**: Because Appsmith does not offer a formally documented external API with standard authentication methods, integrating with it programmatically is limited. Most management operations are intended to be performed through the Appsmith UI.

## Features

### Application Management

Appsmith's internal server provides CRUD APIs for managing applications, workspaces, pages, and widgets. These are not publicly documented but include the ability to create, update, delete, clone, fork, import, and export applications. Applications can be exported as JSON files and imported into other workspaces or instances.

- Applications belong to workspaces and contain pages, datasources, queries, and JS objects.
- Applications can be connected to Git repositories for version control, branching, and multi-environment deployments.
- Import/export supports JSON files and Git-based import.
- Datasource credentials are not included in exports for security reasons and must be reconfigured on import.

### Workspace and User Management

Workspaces are the organizational unit in Appsmith that group applications, datasources, and users together. Users can be invited to workspaces with specific roles (Viewer, Developer, Administrator).

- Granular Access Control (Business/Enterprise) allows creating custom roles and user groups.
- SCIM provisioning is supported for automated user and group management.
- In the Community Edition, sharing is workspace-level only; per-app sharing requires Business Edition.

### Workflows

Appsmith Workflows (Business/Enterprise) allow building code-based automations that can connect to APIs and databases.

- Workflows can be triggered via webhook URLs (external POST requests), from within Appsmith apps, or on a cron schedule.
- Workflows can return HTTP responses to the calling service.
- Schedule triggers use standard 5-field cron expressions with timezone configuration.

### Datasource Connections

Appsmith supports connecting to a wide range of databases and APIs as datasources for use in applications.

- Supported databases include PostgreSQL, MySQL, MongoDB, DynamoDB, Elasticsearch, S3, and many more.
- REST and GraphQL APIs can be connected with support for OAuth 2.0 (Authorization Code and Client Credentials flows), API Key, Bearer Token, and Basic authentication.
- Datasource credentials are encrypted and stored server-side, never exposed to client applications.

### Application Embedding

Appsmith applications can be embedded into external websites or portals using iframes.

- Private embedding requires users to authenticate before accessing the embedded app.
- Embed settings control iframe security and content isolation.

### Audit Logs

Audit logs (Business/Enterprise) record all notable events on an Appsmith instance, including application lifecycle events, user actions, datasource changes, and instance configuration changes.

- Events include: workspace CRUD, application CRUD/import/export/deploy/fork, page CRUD/view, user login/signup, query execution, role/group management, and instance settings changes.
- Logs can be filtered by user, resource, and time, and exported as JSON.
- Logs are stored in the Appsmith MongoDB database (`auditlog` collection) and can be queried directly.

### Instance Monitoring

Two unauthenticated APIs are available for monitoring self-hosted instances:

- **Health Check API** (`/api/v1/health`): Returns whether the instance is operational.
- **Application Performance API** (`/api/v1/consolidated-api/view`): Returns user profile, feature flags, and organization configuration details including license plan and available authentication providers.

### Git Version Control

Applications can be connected to Git repositories (GitHub, GitLab, Bitbucket, or other Git providers) for version control.

- Supports branching, committing, pulling, pushing, and merging.
- Enables multi-environment workflows (dev/staging/production) using separate branches and instances.
- SSH key-based authentication is used for Git connections (ECDSA 256 and RSA 4096 keys).

## Events

Appsmith Workflows support receiving incoming webhook events from external systems. When a workflow's webhook trigger is enabled, it generates a unique URL that external services can POST to, triggering the workflow execution.

- **Webhook Triggers**: External systems can send HTTP POST requests with JSON payloads to trigger workflows. The workflow receives the full request body as input parameters.
  - A unique webhook URL is generated per workflow.
  - Workflows can process the incoming data, execute queries, call APIs, and return a response.
  - Available on Business and Enterprise editions only.

Appsmith does not provide outbound webhooks or event subscription mechanisms to notify external systems about changes within the platform (e.g., application updates, user actions). Audit logs capture these events internally but do not support webhook-based delivery to external endpoints.
