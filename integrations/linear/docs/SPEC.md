# Slates Specification for Linear

## Overview

Linear is a project management and issue tracking tool designed for software development teams. It provides a GraphQL API for managing issues, projects, cycles, teams, documents, and users within workspaces (organizations).

## Authentication

Linear supports two authentication methods:

### 1. Personal API Keys

Admins and permitted Members can create personal API keys from Settings > Account > Security & Access. For each key you create, you can choose to give it full access to the data your user can access, or restrict it to certain permissions (Read, Write, Admin, Create issues, Create comments). You can also limit an API key's access to specific teams in your workspace.

The API key is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <API_KEY>`.

### 2. OAuth 2.0

Linear supports OAuth2 authentication, which is recommended if you're building applications to integrate with Linear.

**Endpoints:**

- Authorization: `GET https://linear.app/oauth/authorize`
- Token exchange: `POST https://api.linear.app/oauth/token`
- Token revocation: `POST https://api.linear.app/oauth/revoke`

**Credentials required:**

- `client_id` and `client_secret` — obtained when creating an OAuth2 Application in Linear's API settings.

**Scopes** (comma-separated):

- `read` — (Default) Read access for the user's account. Always present.
- `write` — Write access for the user's account.
- `issues:create` — Allows creating new issues and their attachments only.
- `comments:create` — Allows creating new issue comments only.
- `timeSchedule:write` — Allows creating and modifying time schedules.
- `admin` — Full access to admin-level endpoints.

**Actor modes:**

- `user` (default) — Resources are created as the authorizing user.
- `app` — Resources are created as the application itself (for service accounts/agents).

**Token behavior:**
OAuth2 applications created from October 1, 2025 onwards have refresh tokens enabled by default for user-initiated OAuth with no option to disable them. The access token is valid for 24 hours and will need to be refreshed when it expires.

**PKCE:** Linear supports the PKCE flow. Include `code_challenge` and `code_challenge_method` (`plain` or `S256`) in the authorization request.

**Client Credentials:** Linear supports the `client_credentials` grant type for OAuth2 apps that use tokens for server-to-server communication and cannot support a user-initiated OAuth flow involving refresh tokens. The token generated using this grant type will be an app actor token that has access to all public teams in the workspace and is valid for 30 days.

**API Endpoint:** Linear's GraphQL endpoint is: `https://api.linear.app/graphql`. All API requests use this single endpoint with the `Authorization: Bearer <ACCESS_TOKEN>` header.

## Features

### Issue Tracking

Create, read, update, and delete issues within teams. Issues support titles, descriptions (Markdown), assignees, priorities, labels, estimates, due dates, and workflow states (e.g., Backlog, Todo, In Progress, Done, Canceled). Issues can be linked to projects, cycles, and other issues. Sub-issues and parent-issue relationships are supported.

### Projects

Manage projects that group related issues across teams. Projects have statuses, lead assignees, target dates, milestones, and descriptions. Projects can contain project updates to communicate progress.

### Cycles

Manage time-boxed iterations (sprints) within teams. Cycles have start and end dates and contain a set of issues. Teams can configure cycle durations and auto-scheduling behavior.

### Teams

Query and manage teams (organizational units that contain issues). Teams have configurable workflow states, labels, templates, estimation types (Fibonacci, exponential, T-shirt sizes, etc.), and cycle settings. Sub-teams are supported.

### Labels

Create and manage issue labels at the team or organization level for categorizing issues.

### Users and Organization

Query user profiles, team memberships, and organization-level settings. Manage user notification preferences.

### Documents

Create and manage documents within the workspace. Documents support rich Markdown content and can be associated with projects.

### Comments

Create and manage comments on issues. Supports Markdown formatting and @mentions via resource URLs.

### Attachments

Manage issue attachments, including external link attachments and file uploads. Attachments can also be used to store custom metadata on issues.

### Customers

Upsert customers, creating them if they don't exist, updating them otherwise. Matches against an existing customer with `id` or `externalId`. Customers can be linked to needs and issues.

### Search

Vector search capabilities are available for similarity searches on issues. Standard filtering is also available on most entity queries with rich filter operators (date comparisons, string matching, relational filters).

### Workflow States

Manage custom workflow states per team that define the lifecycle of issues (e.g., Triage, Backlog, Todo, In Progress, Done, Canceled).

### Notifications

Query and manage notifications for the authenticated user.

### File Uploads

Upload images, videos, and other files directly to Linear's cloud storage via the API.

## Events

Linear supports webhooks that deliver real-time HTTP POST notifications when data changes in a workspace.

Webhooks are specific to an Organization, but you can configure webhooks to provide updates from all public teams, or a single team. Only workspace admins, or OAuth applications with the admin scope, can create or read webhooks.

Webhooks can be created via the Linear UI (Settings > Administration > API) or programmatically via GraphQL mutations. Each webhook returns a signing secret for payload verification via HMAC signatures.

Webhook payloads include the full data object, the action type (create, update, remove), and the previous values of changed properties.

### Event Categories

The following resource types can be subscribed to:

- **Issues** — Triggered when issues are created, updated, or removed. Includes state changes, assignment changes, priority changes, etc.
- **Comments** — Triggered when issue comments are created, updated, or removed.
- **Issue Attachments** — Triggered when attachments on issues are created, updated, or removed.
- **Issue Labels** — Triggered when labels are created, updated, or removed.
- **Documents** — Triggered when documents are created, updated, or removed.
- **Projects** — Triggered when projects are created, updated, or removed.
- **Project Updates** — Triggered when project updates are created, updated, or removed.
- **Cycles** — Triggered when cycles are created, updated, or removed.
- **Emoji Reactions** — Triggered when emoji reactions are added or removed.
- **Users** — Triggered when user profiles are updated.
- **Issue SLAs** — Triggered when SLA status changes on issues.

Linear provides webhooks which allow you to receive HTTP push notifications whenever data is created, updated or removed. This allows you to build integrations that respond to changes in real time, such as triggering CI builds, updating external systems, or sending messages based on issue activity.
