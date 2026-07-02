Let me get the full list of webhook event types from the official docs.Now I have enough information to compile the specification. Let me also fetch the webhook events page to get the complete list of event types.# Slates Specification for Figma

## Overview

Figma is a collaborative interface design tool for creating, prototyping, and handing off digital designs. Its REST API provides programmatic access to files, comments, components, variables, projects, users, and webhooks across Figma Design and FigJam. The API base URL is `https://api.figma.com`.

## Authentication

Figma supports two authentication methods:

### 1. Personal Access Tokens

Generate a personal access token for your Figma account. A personal access token allows you to make REST API requests using your personal Figma account. Tokens are created from Figma's Settings page under the Security tab. When generating a token, you assign scopes and an optional expiration.

Include the token in requests via the `X-Figma-Token` header:

```
X-Figma-Token: <personal_access_token>
```

### 2. OAuth 2.0 (Recommended)

Create an OAuth app to use OAuth 2, which lets you make requests with access tokens that you obtain on behalf of the users of your app. Some parts of the REST API, such as the Activity Logs API and Discovery API, require you to use an OAuth app for authentication.

- **Register your app** at `https://www.figma.com/developers/apps`, providing a name, team/organization, and redirect URL(s).
- **Authorization URL**: `https://www.figma.com/oauth` — redirect users here with `client_id`, `redirect_uri`, `scope`, `state`, and `response_type=code`.
- **Token exchange URL**: `https://api.figma.com/v1/oauth/token` — exchange the authorization code for an access token and refresh token using `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, and `code`.
- **Token refresh URL**: `https://api.figma.com/v1/oauth/token` — refresh tokens using `client_id`, `client_secret`, and `refresh_token`.
- PKCE is supported (S256). Both space-separated and comma-separated scopes are supported.
- Include the access token in requests via the `Authorization` header: `Authorization: Bearer <access_token>`.
- If your OAuth app is public, it undergoes review by Figma. Private apps are restricted to your team/organization.

### Scopes

Scopes for personal access tokens and OAuth 2 tokens determine which endpoints can be accessed. Available scopes:

| Scope                       | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `current_user:read`         | Read user name, email, and profile image                 |
| `file_content:read`         | Read file contents (nodes, editor type)                  |
| `file_metadata:read`        | Read file metadata                                       |
| `file_comments:read`        | Read file comments                                       |
| `file_comments:write`       | Post/delete comments and reactions                       |
| `file_dev_resources:read`   | Read dev resources in files                              |
| `file_dev_resources:write`  | Write dev resources to files                             |
| `file_variables:read`       | Read variables (Enterprise only)                         |
| `file_variables:write`      | Write variables/collections (Enterprise only)            |
| `file_versions:read`        | Read file version history                                |
| `files:read`                | Deprecated broad read scope                              |
| `library_analytics:read`    | Read design system analytics (Enterprise only)           |
| `library_assets:read`       | Read published component/style data                      |
| `library_content:read`      | Read published components/styles of files                |
| `team_library_content:read` | Read published components/styles of teams                |
| `projects:read`             | List projects and files in projects                      |
| `selections:read`           | Read most recent selection in files                      |
| `webhooks:read`             | Read webhook metadata                                    |
| `webhooks:write`            | Create and manage webhooks                               |
| `org:activity_log_read`     | Read org activity logs (Enterprise admin only)           |
| `org:discovery_read`        | Read org text events (Enterprise Governance+ admin only) |

## Features

### File Access & Inspection

Read the full JSON tree of any Figma file, including all layers/nodes, their properties (dimensions, colors, text, effects, layout), and metadata like name, last modified date, thumbnail, and editor type. You can inspect a JSON representation of the file, where every layer or object is represented by a node, and access any properties associated with it. You can request specific nodes by ID and control depth of traversal.

### Image Export

Render specific nodes or entire files as images in formats such as PNG, SVG, JPG, and PDF. You can configure scale, SVG options (outline text, include node IDs), and retrieve download links for user-supplied image fills in documents. Image URLs expire after no more than 14 days.

### Comments

In addition to accessing files and layers, you can GET and POST comments to files. You can read, create, reply to, and delete comments, as well as add reactions to comments.

### Version History

Access the version history of files, including version names, timestamps, and the user who created each version.

### Projects & Teams

List projects within a team and files within a project. Browse team-level resources and structure.

### Components & Styles

Access published components, component sets, and styles from team libraries. Retrieve metadata such as name, description, key, thumbnails, and containing file for individual published components and styles.

### Variables (Enterprise Only)

Query, create, update, and delete variables. Variables in Figma Design store reusable values that can be applied to all kinds of design properties and prototyping actions. You can also read published variables from library files.

### Dev Resources

Query, create, and update dev resources. Dev resources are developer-contributed URLs that are attached to nodes in files and are shown in Figma Dev Mode. Supports bulk creation and deletion, as well as filtering by node ID.

### Library Analytics (Enterprise Only)

Retrieve usage analytics for your design system libraries, including action time series data for components, styles, and variables, grouped by dimensions like component or team.

### Users

Retrieve the current authenticated user's profile information (name, email, avatar).

### Activity Logs (Enterprise Only)

The Activity Logs API requires an OAuth app for authentication. Read organization-wide activity logs for auditing and compliance purposes.

### Discovery (Enterprise Governance+ Only)

The Discovery API is used to obtain text events that have occurred in Figma files throughout your organization. It is only available to Enterprise plans with Governance+. Only organization admins can query it. Text events include in-file text, cursor chat, comments, component documentation, and Dev Mode annotations.

### SCIM Provisioning

Simplify onboarding and offboarding with role-setting via the SCIM API. Manage user provisioning and role assignments from your identity provider.

## Events

Webhooks allow you to observe when specific events happen in files. For example: a collaborator comments on a file, or you add a new version to a file's history. Using these events as triggers, you can build integrations with other applications.

Webhooks are attached to a given context. Webhook contexts include teams, projects, and files. Each webhook subscribes to a single event type and sends a POST request with a JSON payload to your specified callback URL. A `passcode` is included in each payload for verification.

A paid plan is required to use Figma webhooks.

### File Update (`FILE_UPDATE`)

Triggered when a file is updated/saved. Contains the file key, file name, and timestamp.

### File Delete (`FILE_DELETE`)

Triggered when a file is deleted from a team or project.

### File Version Update (`FILE_VERSION_UPDATE`)

Triggered when a named version is added to a file's version history.

### File Comment (`FILE_COMMENT`)

Notifies when a comment is added or modified. Includes comment text, mentions, the commenter, and the associated file.

### Library Publish (`LIBRARY_PUBLISH`)

Notifies when a library is published. Supports variables in LIBRARY_PUBLISH webhook events. Includes details about created, modified, and deleted components, styles, and variables.

### Dev Mode Status Update (`DEV_MODE_STATUS_UPDATE`)

The DEV_MODE_STATUS_UPDATE event is triggered when the Dev Mode status of a layer changes. This can be used to track when layers are marked Ready for Dev, Completed, or a Dev Status is cleared in Figma Design, and includes information like a change message if one was provided when the status changed.

### Ping (`PING`)

A system event sent automatically when a webhook is created to confirm connectivity. Cannot be subscribed to directly.
