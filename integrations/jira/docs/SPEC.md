Now let me get the full list of webhook events from the Atlassian docs page:# Slates Specification for Jira

## Overview

Jira is a project tracking and issue management platform developed by Atlassian. It is available as Jira Cloud (SaaS) and Jira Data Center (self-hosted), and provides REST APIs for managing issues, projects, sprints, boards, workflows, and users. The API covers Jira Software (agile features like sprints and boards) and Jira Service Management (service desk features).

## Authentication

Jira supports different authentication methods depending on the deployment type (Cloud vs. Data Center).

### Jira Cloud

**OAuth 2.0 (3LO) — Recommended**

OAuth 2.0 authorization code grants (3LO) is the recommended method for most cases. This is a token-based method that allows your integration to access Atlassian product APIs on a user's behalf, involving the end user in the authorization process by asking them to consent to access their data.

- **Setup:** You manage OAuth 2.0 (3LO) apps using the Atlassian developer console, which lets you view information about your apps, including their environments and scopes.
- **Authorization URL parameters:**
  - `audience`: set to `api.atlassian.com`; `client_id`: set to the Client ID for your app from the developer console.
  - `redirect_uri`: set to the callback URL configured in Authorization for your app in the developer console.
  - `scope`: space-separated list of requested scopes.
  - `state`: a CSRF token for security.
  - `response_type`: set to `code`.
- **Token exchange:** Exchange the authorization code for an access token and refresh token at `https://auth.atlassian.com/oauth/token`.
- **Refresh tokens:** Refresh tokens are implemented using rotating refresh tokens, which issue a new limited-life refresh token each time they are used, reducing the period in which a compromised token can be exploited.
- **Scopes:** Scopes enable an app to request a level of access to an Atlassian product. Jira permissions also control access to data and aren't overridden by scopes. The recommendation is to use classic scopes. Key classic scopes include:
  - `read:jira-work` — Read access to Jira projects, issues, etc.
  - `write:jira-work` — Write access to create/update issues, worklogs, etc.
  - `read:jira-user` — Read access to user information.
  - `manage:jira-project` — Manage project settings.
  - `manage:jira-configuration` — Manage Jira global settings.
  - `manage:jira-webhook` — Manage webhooks.
- **Cloud ID:** After authorization, you must call `https://api.atlassian.com/oauth/token/accessible-resources` to obtain the `cloudId` of the user's site. API calls are then made to `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`.

**Basic Authentication (API Token)**

Basic authentication uses an API token generated from a user's Atlassian Account, encoded, then added to the header for requests. Authorization is based on the permissions of the user who generated the token.

- Basic auth requires API tokens. You generate an API token for your Atlassian account and use it to authenticate anywhere where you would have used a password.
- Token management at: `https://id.atlassian.com/manage-profile/security/api-tokens`
- Sent as HTTP Basic Auth with email as username and API token as password.
- Scoped API tokens are available — the scope defines the levels of access to data in your Jira and Confluence apps.
- Scoped tokens require calling the Atlassian API at `https://api.atlassian.com/ex/jira/{cloudId}`.
- Base URL for non-scoped tokens: `https://{your-domain}.atlassian.net/rest/api/3/...`

### Jira Data Center

- **Personal Access Tokens (PAT):** Bearer tokens generated from user profile settings. Sent as `Authorization: Bearer {token}`.
- **Basic Authentication:** Basic authentication is available for Jira Data Center but it isn't as secure as other methods. Recommended for simple scripts and manual calls. Uses username and password.
- **OAuth 1.0a:** Application links use OAuth with RSA-SHA1 signing for authentication, meaning a private key is used to sign requests rather than the OAuth token secret/consumer secret.

## Features

### Issue Management

Create, read, update, and delete issues across projects. Supports setting all standard and custom fields (summary, description, assignee, priority, labels, components, etc.), transitioning issues through workflow statuses, and bulk operations for creating/updating multiple issues at once. Issues can have sub-tasks and be linked to other issues.

### Issue Search (JQL)

Search for issues using Jira Query Language (JQL), a powerful query syntax that supports filtering by any field, combining conditions with AND/OR, ordering, and more. Returns full issue details or specific fields.

### Projects

Create and manage projects, including project settings, components, and versions/releases. Supports different project types (software, service management, business). Projects can be archived, trashed, and restored.

### Boards and Sprints (Agile)

Manage Scrum and Kanban boards. Create, start, close, and delete sprints. Move issues to/from sprints and the backlog. Configure board filters and columns. Available through the Jira Software REST API.

### Worklogs and Time Tracking

Log time spent on issues, update and delete work logs. Supports time tracking configuration and estimation fields.

### Comments and Attachments

Add, update, and delete comments on issues. Upload and manage file attachments. Comments support Atlassian Document Format (ADF) in API v3, or plain text in API v2.

### Users and Groups

Query user information, search for users, and manage group memberships. User permissions are governed by Jira's permission schemes.

### Workflows

Read workflow configurations and statuses. Transition issues between statuses. Workflow schemes control which workflows apply to which project/issue type combinations.

### Permissions and Security

Query effective permissions for users, manage permission schemes, and issue security levels. The API respects all Jira permission checks.

### Filters and Dashboards

Create, read, update, and delete saved JQL filters. Manage filter sharing and favorites. Manage dashboards and dashboard gadgets.

### Versions (Releases)

Create, update, move, merge, release, and unrelease project versions. Useful for release management workflows.

### Issue Links

Create and manage links between issues (e.g., "blocks", "is duplicated by"). Supports both intra-project and cross-project links.

### Notifications

Manage notification schemes that control when and how users are notified about issue changes.

### Custom Fields

Read custom field definitions and configurations. Custom fields are referenced by their ID (e.g., `customfield_10001`).

### Epics

Manage epics via the Jira Software API, including moving issues to/from epics and ranking.

## Events

Jira supports webhooks — user-defined callbacks over HTTPS that notify your app when certain events occur in Jira, such as when an issue has been updated or when a sprint has been started, eliminating the need to periodically poll.

Webhooks can be registered via the Jira Administration UI, the REST API, or within an Atlassian Connect/Forge app descriptor. Webhooks can be filtered with JQL queries to only fire for a specific set of issues. Webhook delivery is best effort and not guaranteed.

### Issue Events

Fires when an issue is created, updated, or deleted (`jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted`). Supports JQL filtering. Updated events include a changelog showing which fields changed.

### Comment Events

Fires when a comment is created, updated, or deleted (`comment_created`, `comment_updated`, `comment_deleted`). Supports JQL filtering.

### Attachment Events

Fires when an attachment is created or deleted (`attachment_created`, `attachment_deleted`). Supports JQL filtering.

### Worklog Events

Fires when a worklog entry is created, updated, or deleted (`worklog_created`, `worklog_updated`, `worklog_deleted`). Supports JQL filtering.

### Issue Link Events

Fires when an issue link is created or deleted (`issuelink_created`, `issuelink_deleted`).

### Issue Property Events

Fires when an issue property is set or deleted (`issue_property_set`, `issue_property_deleted`). Supports JQL filtering.

### Issue Type Events

Fires when an issue type is created, updated, or deleted (`issuetype_created`, `issuetype_updated`, `issuetype_deleted`).

### Project Events

Fires on project lifecycle changes: created, updated, deleted, moved to trash, restored from trash, archived, restored from archive.

### Version (Release) Events

Fires when a project version is created, updated, moved, released, unreleased, deleted, or merged. Sprint and project version events do not support JQL, field, or property filtering.

### Sprint Events

Fires when a sprint is created, updated, started, closed, or deleted (`sprint_created`, `sprint_updated`, `sprint_started`, `sprint_closed`, `sprint_deleted`). Does not support JQL filtering.

### Board Events

Fires when a board is created, updated, deleted, or has its configuration changed (`board_created`, `board_updated`, `board_deleted`, `board_configuration_changed`).

### User Events

Fires when a user is created, updated, or deleted (`user_created`, `user_updated`, `user_deleted`).

### Filter Events

Fires when a saved filter is created, updated, or deleted (`filter_created`, `filter_updated`, `filter_deleted`).

### Configuration Events

Fires when Jira system configuration options change, such as voting, watching, subtasks, issue links, or time tracking settings.
