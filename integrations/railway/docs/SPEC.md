Now let me get more details on the webhook events and the scopes list:# Slates Specification for Railway

## Overview

Railway is a cloud platform for deploying and managing web applications, databases, and infrastructure services. It provides a GraphQL API for programmatic management of projects, services, deployments, environments, variables, domains, and volumes. Railway supports multiple languages and frameworks, with features like automatic builds, GitHub autodeploys, and managed databases (PostgreSQL, MySQL, Redis, MongoDB).

## Authentication

Railway supports multiple authentication methods:

### API Tokens

Tokens are created from the tokens page in account settings. There are three types:

1. **Account Token** — Created by selecting "No workspace"; tied to your Railway account with the broadest scope. The token can perform any API action you're authorized to do across all your resources and workspaces.

2. **Workspace Token** — Created by selecting a specific workspace. A workspace token has access to all the workspace's resources, and cannot be used to access your personal resources or other workspaces on Railway.

3. **Project Token** — Created from the tokens page in project settings. Project tokens are scoped to a specific environment within a project and can only be used to authenticate requests to that environment.

Account and workspace tokens are passed via the `Authorization: Bearer <token>` header. Project tokens use the `Project-Access-Token` header, not the `Authorization: Bearer` header.

**GraphQL endpoint:** `https://backboard.railway.com/graphql/v2`

### OAuth 2.0 (Login with Railway)

Login with Railway allows third-party applications to authenticate users with their Railway account. Built on OAuth 2.0 and OpenID Connect (OIDC), it provides a secure, standardized way for users to grant your application access to their Railway resources without sharing their password.

- **OIDC Discovery:** Published at a standard `.well-known` endpoint.
- **App Registration:** Register a new OAuth app in your workspace settings under Developer. Enter a name, add redirect URI(s), and select the appropriate app type.
- **App Types:** Web applications are confidential clients that run on servers you control, where a client secret can be stored securely. Native applications (mobile, desktop, CLIs, SPAs) are public clients. Native apps authenticate using PKCE exclusively.
- **Dynamic Client Registration:** Supported, allowing applications to register OAuth clients programmatically rather than through the UI.
- Access tokens expire in one hour. For longer-lived access, request the `offline_access` scope to receive a refresh token. Refresh tokens expire after one year.

**Available OAuth Scopes:**

| Scope              | Description                                        |
| ------------------ | -------------------------------------------------- |
| `openid`           | Required for all requests                          |
| `email`            | Access user's email address                        |
| `profile`          | Access user's name and picture                     |
| `offline_access`   | Receive refresh tokens (requires `prompt=consent`) |
| `workspace:viewer` | Viewer access to user-selected workspaces          |
| `workspace:member` | Member access to user-selected workspaces          |
| `workspace:admin`  | Admin access to user-selected workspaces           |
| `project:viewer`   | Viewer access to user-selected projects            |
| `project:member`   | Member access to user-selected projects            |

Workspace and project scopes grant access to Railway resources. These are selective: the user chooses which specific workspaces or projects to share during consent.

## Features

### Project Management

Create, list, update, and delete projects. Railway is organized around projects and workspaces. Projects contain services and environments that represent your application infrastructure. Projects belong to workspaces, which can have multiple members with different roles.

### Service Management

Manage services using the Public API — fetch service details, get service configuration for specific environments, create empty services, and update service settings. Services can be configured with source repositories, Docker images, build settings, and deploy settings per environment.

### Deployment Management

Trigger, monitor, and manage deployments for services. View deployment status and history, redeploy or roll back services, and cancel in-progress deployments. Deployments can be triggered from GitHub repos or Docker images.

### Environment Management

Create and manage environments (e.g., production, staging). Each environment maintains its own set of variables, domains, and deployment configurations. Services can be configured differently per environment.

### Variable Management

Set, update, and delete environment variables for services. Variables can be shared across services within a project or scoped to individual services. Railway supports variable references between services.

### Domain Management

Configure public networking for services including Railway-provided domains (`.railway.app`) and custom domains. Railway provides automatic SSL certificates, Railway-provided domains, and support for custom domains.

### Volume Management

Create and manage persistent storage volumes attached to services. Volumes retain data across deployments and can be backed up.

### Database Services

Railway offers persistent database services for PostgreSQL, MySQL, MongoDB, and Redis. These can be provisioned as services within projects and connected to application services via environment variables.

## Events

Railway supports webhooks for receiving real-time notifications about platform events.

### Deployment Status Changes

Webhooks can be used to notify your own application of deployment status changes and alerts. They are configured per project. Notifications are sent when any service's deployment status changes across all environments in the project. Available deployment states include building, deploying, success, failed, crashed, etc.

### Volume Usage Alerts

Notifications when volumes approach storage capacity thresholds.

### CPU/RAM Monitor Alerts

Notifications when resource usage (CPU or memory) exceeds configured thresholds.

**Configuration:** Webhooks are set up in project settings by providing a destination URL. You can optionally specify which event types to receive. Railway supports automatic payload transformation ("muxers") for Discord and Slack webhook URLs. A test webhook button is available to verify the integration.
