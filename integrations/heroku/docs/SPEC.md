Now let me get the full list of webhook event entity types from the App Webhooks page:Now I have all the information I need. Let me compile the specification.

# Slates Specification for Heroku

## Overview

Heroku is a cloud platform-as-a-service (PaaS) that enables developers to build, deploy, and manage applications. It provides the Heroku Platform API (currently version 3) at `api.heroku.com`, which allows programmatic management of apps, add-ons, dynos, releases, and other platform resources. Heroku is owned by Salesforce and also offers integration with Salesforce through Heroku Connect.

## Authentication

Heroku supports two primary authentication methods for its Platform API:

### 1. OAuth 2.0 (Recommended for third-party integrations)

The Heroku Platform API implements OAuth version 2.0 as the preferred authentication mechanism.

- **Authorization endpoint:** `https://id.heroku.com/oauth/authorize`
- **Token endpoint:** `https://id.heroku.com/oauth/token`
- **Grant type:** Authorization Code (`response_type=code`)
- When you register a client, you provide a callback URL and a name. When you register a client, you get an ID and a secret that you use to authorize Heroku users against.

**OAuth Scopes:**

| Scope             | Description                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `identity`        | Allows access to `GET /account` for basic user info, but nothing else.                                                    |
| `read`            | Read access to all a user's apps and their subresources, except for protected subresources like config vars and releases. |
| `write`           | Write access to apps and unprotected subresources. Superset of `read`.                                                    |
| `read-protected`  | Read including protected subresources. Superset of `read`.                                                                |
| `write-protected` | Write including protected subresources. Superset of `read-protected` and `write`.                                         |
| `global`          | Global access encompassing all other scope.                                                                               |

The `read`, `write`, `read-protected`, and `write-protected` scopes do not grant access to account identity details such as email address.

The OAuth setup requests only `global`. Heroku rejects authorization URLs that combine `global` with narrower scopes because `global` is already a superset of those permissions.

### 2. API Token (Bearer Token)

For personal scripts you may also use HTTP bearer authentication. HTTP bearer authentication must be constructed using an API token, passed as the Authorization header for each request, for example `Authorization: Bearer 01234567-89ab-cdef-0123-456789abcdef`.

Tokens can be created in several ways:

- You can create a non-expiring token by running `heroku authorizations:create`.
- The Heroku Dashboard offers an API key on the Account settings page (for non-SSO accounts).
- The `heroku auth:token` command returns a token that expires a year after login by default. If you have SSO enabled, this token will expire 8 hours after you login.

All API requests require the header: `Accept: application/vnd.heroku+json; version=3`.

## Features

### App Management

Create, update, delete, and list applications on the Heroku platform. Manage app settings including name, region, stack, and maintenance mode. Transfer apps between accounts.

### Dyno & Formation Management

Scale applications by adjusting the number and size of dynos per process type. Run one-off dynos for tasks like database migrations or console sessions. View running dynos and restart them.

### Add-on Provisioning & Management

Provision, configure, and remove add-on services (databases, caching, monitoring, etc.) for apps. Manage add-on attachments to share add-on resources across multiple apps. Browse available add-on services and plans.

### Configuration Variables

Read and update environment configuration variables for apps. Config vars store sensitive credentials like database URLs and API keys.

- Requires `read-protected` or `write-protected` OAuth scope to access.

### Builds & Releases

Use the build resource to build source code into slugs that can be run by apps on the Heroku platform. The build resource complements the interactive git-based deployment flow but is optimized for non-interactive continuous integration setups. Manage releases, roll back to previous releases, and download slugs.

### Domain & SSL Management

Add and remove custom domains for apps. Manage SNI endpoints for SSL/TLS certificates on custom domains.

### Collaborator Management

Add, remove, and manage collaborators who have access to an app. Control permissions for team members.

### Account Management

View and update account details, manage account features (Heroku Labs), and manage SSH keys.

### Team & Enterprise Management

Manage teams, team members, and team-level settings. Handle enterprise account structures and permissions.

### Pipeline Management

Manage Heroku Pipelines for continuous delivery workflows, including promoting apps between stages (development, staging, production).

### Heroku Connect (Salesforce Sync)

Heroku Connect provides an API to automate the creation, maintenance, and monitoring of sync operations between Salesforce and a Heroku PostgreSQL database. Manage connections, mappings, and sync configuration.

- Uses a separate API with regional endpoints (e.g., `connect-3-virginia.heroku.com/api/v3`).

### Log Drains

Configure log drains to forward application logs to external logging services.

### Webhooks Management

Create, list, update, and delete webhook subscriptions for apps. Inspect webhook delivery status and past events via the API.

## Events

Heroku supports app webhooks that send HTTP POST notifications when changes occur on your apps.

### Subscribing to Webhooks

Webhooks are created per app via the Platform API or CLI. Each subscription requires:

- **include**: Comma-separated list of event entity types to subscribe to.
- **url**: The endpoint URL to receive notifications.
- **level**: Either `notify` (no retries) or `sync` (retries on failure for up to 72 hours).
- **secret** (optional): Used to sign requests via HMAC SHA256 (sent in the `Heroku-Webhook-Hmac-SHA256` header).
- **authorization** (optional): Custom value sent in the `Authorization` header for verification.

Webhook API requests require the header: `Accept: application/vnd.heroku+json; version=3.webhooks`.

You can configure up to 10 webhook subscriptions per app.

### Event Categories

Each event includes an action type of `create`, `destroy`, or `update`. The subscribable entity types are:

| Entity                 | Actions                 | Description                                                                                                                          |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `api:addon`            | create, destroy, update | Add-on provisioned, deleted, or modified.                                                                                            |
| `api:addon-attachment` | create, destroy         | Add-on attached to or removed from an app.                                                                                           |
| `api:app`              | create, destroy, update | App provisioned, deleted, or modified.                                                                                               |
| `api:build`            | create, update          | Build initiated or status changed.                                                                                                   |
| `api:collaborator`     | create, destroy, update | Collaborator added, removed, or modified.                                                                                            |
| `api:domain`           | create, destroy         | Custom domain added or removed.                                                                                                      |
| `api:dyno`             | create                  | New dyno started.                                                                                                                    |
| `api:formation`        | destroy, update         | Dyno formation modified for a process type.                                                                                          |
| `api:release`          | create, update          | Release initiated or status changed.                                                                                                 |
| `api:sni-endpoint`     | create, destroy, update | SNI/SSL endpoint added, removed, or modified.                                                                                        |
| `dyno`                 | (lifecycle states)      | Full dyno lifecycle events including state transitions (starting, up, crashed, down). This is a separate event type from `api:dyno`. |
