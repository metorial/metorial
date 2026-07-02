Note: The "Mural Pay" results are for a different product. Let me focus on Mural (the visual collaboration tool) and get more details on its API features and scopes.Now let me check the Enterprise API for any additional features and webhooks:Now I have a comprehensive understanding. Let me compile the specification.

# Slates Specification for Mural

## Overview

Mural is a digital workspace for visual collaboration, providing shared canvases where teams can work with sticky notes, shapes, images, diagrams, and other visual elements. It offers two sets of APIs: a public Mural API (currently in beta) for product-level capabilities and an Enterprise API for administrative functions. The platform organizes content in a hierarchy of workspaces, rooms, and murals.

## Authentication

Mural supports two authentication methods depending on the API set being used:

### OAuth 2.0 (Public Mural API)

The Mural API uses OAuth 2.0 as a secure method of authorizing interaction between your app and the Mural API. The current implementation uses the Authorization Code Grant method. PKCE (Proof Key for Code Exchange) is also supported to prevent malicious third parties from attempting to steal your access token.

**Endpoints:**

- Authorization URL: `https://app.mural.co/api/public/v1/authorization/oauth2/`
- Access Token URL: `https://app.mural.co/api/public/v1/authorization/oauth2/token`
- Refresh Token URL: `https://app.mural.co/api/public/v1/authorization/oauth2/token`

**Setup:**
Register your app with Mural and save your client ID, client secret, redirect URL(s), and scopes.

**Authorization request parameters:** `client_id`, `redirect_uri`, `scope`, `state`, `response_type=code`.

When the access token expires, you use the refresh token to request a new access token, and the Refresh Token URL responds with a new access token and new refresh token.

**Available Scopes:**

Read scopes:

- `rooms:read` — Retrieve information about a workspace's rooms and room settings.
- `users:read` — Retrieve information about users and their permission levels.
- `workspaces:read` — Retrieve information about workspaces, settings, and properties.
- `murals:read` — Retrieve information about murals from a room and/or workspace.
- `identity:read` — View a user's name, avatar, and company information.
- `templates:read` — Retrieve a workspace's custom template names, descriptions, and categories.

Write scopes:

- `rooms:write` — Create, update, and delete rooms and their properties.
- `murals:write` — Create murals (blank or from a template), manage settings and widgets.
- `templates:write` — Create a template from a mural or delete templates.

### API Keys (Enterprise API)

API keys are custom-generated keys that perform M2M (Machine to Machine) authentication and allow your application to securely talk to the Enterprise API endpoints. API keys are created from the Mural dashboard under Manage company > API keys, where you select the desired scopes and generate the key.

In requests, provide the API key in the Authorization header using the format: `apikey <your-api-key>`.

The Enterprise API is only available to Enterprise plan customers.

## Features

### Mural Management

Create, retrieve, update, duplicate, delete, and export murals. Murals can be created blank or from templates. You can also manage mural access settings and visitor link settings, and search for murals across workspaces.

### Canvas Content (Widgets)

Add and manage content on a mural canvas, including:

- **Sticky notes** — Create and update sticky notes with text, color, and position.
- **Shapes** — Add geometric shapes to a mural.
- **Text boxes and titles** — Add text content to the canvas.
- **Images and files** — Upload and manage images and file attachments on a mural.
- **Arrows** — Create connectors between elements.
- **Areas** — Define grouping areas on the canvas.
- **Tables** — Create table widgets.
- **Comments** — Add and update comments on a mural.

### Tags

Create, retrieve, update, and delete tags within a mural for organizing and categorizing content.

### Voting Sessions

Start, manage, and end voting sessions within a mural. Retrieve voting session results and cast votes on widgets.

### Timer

Start, stop, pause, and resume a countdown timer within a mural for facilitated sessions.

### Private Mode

Start and stop private mode sessions on a mural, allowing participants to work independently before revealing content to the group.

### Chat

Retrieve the chat history for a mural.

### Room Management

Create, retrieve, update, and delete rooms within workspaces. Manage folders within rooms. List rooms including open rooms in a workspace. Search for rooms.

### User Management

Invite users to workspaces, rooms, and murals. Remove users from rooms and murals. Update member permissions at the room and mural level. Retrieve user lists and current user information.

### Workspace Management

Retrieve workspaces and workspace details. Invite users to workspaces.

### Templates

Retrieve default and custom templates. Create custom templates from existing murals. Create new murals from templates. Delete templates. Search for templates.

### Search

Search across murals, rooms, and templates within workspaces.

### Canvas Embed SDK

Embed interactive mural canvases directly within third-party applications, enabling real-time collaboration without leaving the host platform.

### Enterprise Administration (Enterprise API only)

- **Member Information** — Retrieve and manage company member details and user types.
- **Audit Logs** — Access audit log data for compliance and monitoring.
- **Content Ownership Transfer** — Transfer ownership of content between users.
- **eDiscovery** — Identify and export mural content for legal discovery.
- **Reporting** — Generate reports on workspaces, rooms, murals, users, templates, and memberships.
- **SCIM Provisioning** — SCIM is available only with Mural's Enterprise plan. Provision and deprovision users, manage groups, and suspend/unsuspend member accounts via the SCIM 2.0 protocol. Only Mural members can be provisioned via SCIM, not guests.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its public or enterprise API. Third-party integration platforms (like Pipedream) provide polling-based triggers for changes such as new murals, new sticky notes, or new areas, but these are not native webhook or event subscription features of the Mural API itself.
