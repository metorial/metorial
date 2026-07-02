Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Miro

## Overview

Miro is an online collaborative whiteboard platform used for visual collaboration, diagramming, brainstorming, and project planning. Its REST API (v2) allows programmatic management of boards, board items (sticky notes, shapes, cards, images, documents, etc.), connectors, tags, frames, and team/organization settings. Enterprise plans additionally offer SCIM provisioning, audit logs, projects, and data classification features.

## Authentication

All applications interacting with the Miro REST API must implement the OAuth 2.0 authorization code flow.

**OAuth 2.0 Authorization Code Flow:**

1. **Register an app** in the Miro Developer settings to obtain a **Client ID** and **Client Secret**.
2. **Authorization URL:** Redirect users to:
   ```
   https://miro.com/oauth/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}
   ```
3. **Token Exchange:** After the user authorizes, exchange the authorization code for an access token via:

   ```
   POST https://api.miro.com/v1/oauth/token
   ```

   with parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`.

4. **Using the token:** Include the access token in the Authorization header using the format `Bearer {ACCESS_TOKEN}`.

**Token Expiration Options:**

You can use either an expiring access token or a non-expiring access token. You can select to use an expiring or a non-expiring token while creating your app. You cannot enable, disable, or update this setting after you create your app.

- **Expiring tokens (recommended):** The access token expires after one hour. The refresh token expires after sixty days. Refresh via `POST https://api.miro.com/v1/oauth/token` with `grant_type=refresh_token`. When you request a new access token, a new refresh token is also issued. The previous access token and refresh token become invalid.
- **Non-expiring tokens:** The access token does not expire and no refresh token is issued.

**Scopes:**

Scopes are configured on the app settings page before installation. Key scopes include:

| Scope                       | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `boards:read`               | Retrieve information about boards, board members, or items   |
| `boards:write`              | Create, update, or delete boards, board members, or items    |
| `identity:read`             | Read profile information for the current user (Web SDK only) |
| `team:read`                 | Read current team information (Web SDK only)                 |
| `team:write`                | Modify team title, invite users, change roles (Web SDK only) |
| `auditlogs:read`            | Read audit logs (Enterprise only)                            |
| `organizations:read`        | Retrieve organization info (Enterprise only)                 |
| `organizations:teams:read`  | Retrieve team info for an organization (Enterprise only)     |
| `organizations:teams:write` | Create/manage teams for an organization (Enterprise only)    |
| `projects:read`             | Retrieve project information                                 |
| `projects:write`            | Create or manage projects                                    |

## Features

### Board Management

Create, retrieve, copy, update, and delete Miro boards. Boards can be filtered by team or project. Sharing policies and permission policies can be configured per board.

### Board Items

Create, read, update, and delete individual items on a board. Supported item types include:

- **Sticky notes** — with configurable color and text content
- **Shapes** — various shape types with customizable styles
- **Cards** — task-like items with descriptions, due dates, and assignees
- **App cards** — custom card items for app integrations with status and field data
- **Text items** — rich text elements
- **Images** — via URL or file upload
- **Documents** — via URL or file upload (max 6 MB)
- **Embeds** — external content embedded on the board
- **Frames** — container items to organize content; items within a frame can be listed

Items can also be created in bulk. Each item supports positioning (x, y coordinates), geometry (width, height, rotation), and parent assignment (e.g., placing inside a frame).

### Connectors

A connector is a line that connects two items on a board. Connectors support straight, elbowed, and curved shapes, configurable stroke styles and colors, captions, and start/end stroke caps. Connectors that do not connect two items are not supported. If you want to create a connector on the board, it is a prerequisite that you first create two items to serve as the start and end points.

### Tags

Create and manage tags on a board, then attach them to card and sticky note items for categorization. Card and sticky note items can have up to 8 tags. You can retrieve all tags on a board and list items by tag. Updates to tags made via the REST API will not be reflected on the board in realtime. To see REST API updates to tags on a board, you need to refresh the board.

### Groups

Group multiple board items together. Groups can be created, listed, updated, and deleted. You can retrieve items belonging to a specific group.

### Board Sharing & Members

Share boards by inviting users via email. Manage board members with configurable roles. Retrieve, update, or remove specific board members.

### Mind Map Nodes (Experimental)

Create and manage mind map nodes on a board programmatically. This feature is currently experimental.

### Flowchart Shapes (Experimental)

Create and manage flowchart-specific shapes on a board. This feature is currently experimental.

### Projects (Enterprise)

Create and manage projects to organize boards. Manage project members with specific roles and configure project-level settings.

### Organization & Team Management (Enterprise)

Retrieve organization info and manage teams within an organization, including team creation, settings, and membership. Manage user groups and their assignments to teams, boards, and projects.

### Audit Logs (Enterprise)

There is one endpoint part of the REST API offering that is only accessible by Enterprise customer, it is: Audit logs. Retrieve audit logs for activities within an organization, sortable in ascending or descending order.

### Board Classification (Enterprise)

Set and retrieve data classification labels at the organization, team, and board level. Supports bulk classification updates.

### eDiscovery (Enterprise Guard)

Export boards as PDF, retrieve content change logs for board items, and manage legal holds and cases for compliance purposes.

### SCIM Provisioning (Enterprise)

We offer another set of specific API in addition for Enterprise users named SCIM. Manage user lifecycle (create, update, delete, list users) and groups using the SCIM 2.0 standard for identity provisioning.

## Events

Miro supports webhooks for receiving notifications about board item changes.

### Board Item Updates

Creates a webhook subscription to receive notifications when an item on a board is updated. Subscriptions are created per user, per board. You can create multiple subscriptions.

- **Scope:** A subscription is tied to a specific board ID.
- **Callback URL:** Must be publicly accessible and respond to a challenge verification request from Miro (echoing back the `challenge` value).
- **Supported events:** Notifications are sent when board items are created, updated, or deleted.
- **Limitations:** We currently support all board items except tags, connectors, and comments.
- **Status:** The webhooks API endpoint is under `v2-experimental`, indicating it may still be evolving.
