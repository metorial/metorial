Now let me get the full scopes list:Now I have all the information needed. Let me compile the specification.

# Slates Specification for Canva

## Overview

Canva is an online graphic design platform that allows users to create designs, presentations, social media graphics, and other visual content. The Canva Connect API is a REST API that enables external applications to programmatically manage assets, designs, folders, comments, and brand templates within a user's Canva account. Integrations can be public (available to all Canva users) or private (available only to your team on a Canva Enterprise plan).

## Authentication

Canva uses OAuth 2.0 with the Authorization Code flow with Proof Key for Code Exchange (PKCE) using SHA-256.

**Setup:**

1. Create an integration in the [Canva Developer Portal](https://www.canva.com/developers/integrations) to obtain a **Client ID** and **Client Secret**.
2. Configure redirect URIs and select the required scopes in the portal.

**Flow:**

1. Direct users to Canva's authorization URL: `https://www.canva.com/api/oauth/authorize` with query parameters including `code_challenge`, `code_challenge_method=s256`, `scope`, `response_type=code`, `client_id`, `state` (optional but recommended), and `redirect_uri`.
2. When exchanging an authorization code for an access token, set `grant_type` to `authorization_code`, provide the `code_verifier` value, and provide the authorization code received after user authorization.
3. The token endpoint is `POST https://api.canva.com/rest/v1/oauth/token`.
4. Authenticate the token request using basic access authentication, where the credentials string is a Base64 encoded value of `{client_id}:{client_secret}`.

**Token Management:**

- Access tokens typically expire after 4 hours.
- When an access token expires, use the refresh token from a previous request to obtain a new access token.

**Available Scopes:**

| Scope                        | Description                         |
| ---------------------------- | ----------------------------------- |
| `asset:read`                 | View metadata for the user's assets |
| `asset:write`                | Upload, update, or delete assets    |
| `brandtemplate:content:read` | Read brand template content         |
| `brandtemplate:meta:read`    | View brand template metadata        |
| `collaboration:event`        | Receive webhook notifications       |
| `comment:read`               | View comments on designs            |
| `comment:write`              | Create comments and replies         |
| `design:content:read`        | View contents of designs            |
| `design:content:write`       | Create designs                      |
| `design:meta:read`           | View design metadata                |
| `folder:permission:write`    | Manage folder permissions           |
| `folder:read`                | View folder metadata and contents   |
| `folder:write`               | Add, move, or remove folders        |
| `profile:read`               | Read user profile information       |
| `openid`                     | Read user info through OIDC         |
| `profile`                    | Read user profile through OIDC      |
| `email`                      | Read user email through OIDC        |

Scopes must be explicit — for example, `asset:write` does not grant `asset:read` permissions. Both must be specified separately.

## Features

### Asset Management

Upload assets to Canva, such as images, and manage them programmatically. You can view asset metadata, upload new assets, update existing ones, and delete assets from a user's account.

- Supports uploading images for use in designs.
- Requires `asset:read` and/or `asset:write` scopes.

### Design Management

Create and sync designs, including reading design metadata and creating new designs programmatically. You can retrieve design details including titles, thumbnails, creation/update timestamps, and temporary editing/viewing URLs.

- Designs can be created with specified design types and dimensions.
- Temporary edit and view URLs are provided for return navigation workflows; these expire after 30 days.

### Design Import

Import external files (such as PDFs or other supported formats) as new Canva designs. This is an asynchronous operation that may require additional server-side processing to complete.

- Returns a job ID to poll for completion status.

### Design Export

Export finished designs from Canva to external systems in various formats (e.g., PDF, PNG, JPG).

- This is an asynchronous job-based operation.
- You can specify export format and quality options.

### Design Resize

Resize existing designs to different dimensions or preset format types.

- This is an asynchronous operation.

### Brand Templates

The Brand Templates API empowers users to automate processes and generate customer-facing assets at scale by pulling in business data, imagery, and other assets from third-party systems.

- View brand template metadata and content.
- Requires the user to be a member of a Canva Enterprise organization.

### Autofill

Programmatically populate brand templates with dynamic data to generate designs at scale.

- Provide key-value pairs of data fields to fill into a brand template.
- This is an asynchronous job-based operation.
- Requires the user to be a member of a Canva Enterprise organization.

### Folder Management

Organize designs and assets within Canva's folder structure, including the user's Projects folder.

- Create, rename, move, and delete folders.
- List folder contents.
- Manage folder-level permissions.
- Requires `folder:read`, `folder:write`, and/or `folder:permission:write` scopes.

### Comments

Manage Canva notifications, comments, and action tasks directly from your platform via the Comment API.

- Read existing comment threads and replies on designs.
- Create new comment threads and replies.
- Webhooks are not triggered for a user's own comments.

### User Profile

Retrieve information about the authenticated user, including their profile details, team membership, and API capabilities.

## Events

Canva supports outgoing webhooks that send real-time information to your integration without polling or manual intervention. Webhook notifications are currently provided as a preview, meaning there might be unannounced breaking changes, and public integrations using preview features will not pass the review process.

To receive webhooks, enable the `collaboration:event` scope and configure a Webhook URL in your integration settings in the Developer Portal.

### Comment Notifications

Triggered when someone comments on a design. Includes event sub-types for:

- **New**: A new comment thread is created.
- **Assigned**: A comment thread is assigned to a user.
- **Resolved**: A comment thread is resolved.
- Payload includes the comment content, design metadata, and user information.

### Share Design Notifications

Triggered when someone shares a design. Includes metadata about the sharing user, the receiving user, and the shared design.

### Design Approval Requested Notifications

Triggered when someone requests a user to approve a design. Includes design metadata and the approval request message.

### Design Approval Response Notifications

Triggered when someone approves a design or gives feedback. Includes whether the design was approved and whether it is ready to publish.

### Design Access Requested Notifications

Triggered when someone requests access to a design. Includes user and design metadata and a URL to approve the access request.

### Folder Access Requested Notifications

Triggered when someone requests access to a folder. Includes user and folder metadata.

### Team Invite Notifications

Triggered when someone is invited to a Canva team. Includes inviter user metadata.

### Suggestion Notifications

Triggered when someone suggests edits to a design, applies or rejects a suggestion, replies to a suggestion, or mentions a user in a reply to a suggestion. Includes event sub-types for:

- **New**: A new suggestion is created.
- **Accepted**: A suggestion has been accepted.
- Payload includes the suggestion content and type (add, delete, or format text).
