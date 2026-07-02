Let me get the full list of webhook events and the Confluence API v2 details.Now I have all the information needed. Let me also check the scopes page for more detail.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Confluence

## Overview

Confluence is a team collaboration and wiki platform by Atlassian used for creating, organizing, and sharing documentation, knowledge bases, and project information. It provides a REST API (v1 and v2) for programmatic access to spaces, pages, blog posts, comments, attachments, and other content entities. Confluence is available as both a Cloud-hosted and self-managed (Data Center) product, each with slightly different API capabilities.

## Authentication

Confluence supports different authentication methods depending on whether you are using Confluence Cloud or Confluence Data Center.

### Confluence Cloud

**Basic Authentication (API Token)**

Users supply their Atlassian account email and an API token as the username and password. The email and API token must be encoded together in base64 format and sent in the `Authorization: Basic <base64>` header. API tokens are generated from the user's Atlassian account at https://id.atlassian.com/manage-profile/security/api-tokens. The base URL is `https://<your-domain>.atlassian.net/wiki/rest/api/...`.

**OAuth 2.0 (3LO) — Authorization Code Grant**

OAuth 2.0 (3LO) uses three-legged OAuth (authorization code grants). It is a token-based method that allows an app to access Atlassian APIs on a user's behalf.

Setup steps:

1. Create an OAuth 2.0 integration in the Atlassian Developer Console (https://developer.atlassian.com/console), provide a name and accept the developer terms.
2. Configure permissions for the Confluence API and select desired scopes.
3. Add a callback URL under the Authorization section for OAuth 2.0 (3LO).
4. Obtain the Client ID and Client Secret from the app's Settings in the developer console. The Authorization URL generator only shows the authorization URL and does not include the secret.

Key endpoints:

- Authorization URL: `https://auth.atlassian.com/authorize`
- Token URL: `https://auth.atlassian.com/oauth/token`
- API requests are made via `https://api.atlassian.com/ex/confluence/{cloudId}/{api}`, not directly to the site domain.
- To obtain the `cloudId`, call `https://api.atlassian.com/oauth/token/accessible-resources` with the access token.

Access tokens expire after 1 hour. Add the `offline_access` scope to obtain a refresh token for long-lived access.

**Classic scopes** (recommended) include:

- `read:confluence-content.all` — Read all content including body
- `read:confluence-content.summary` — Read content summaries
- `write:confluence-content` — Create pages, blogs, comments
- `write:confluence-space` — Manage space details
- `read:confluence-space.summary` — Read space summaries
- `write:confluence-file` — Upload attachments
- `read:confluence-props` / `write:confluence-props` — Read/write content properties
- `manage:confluence-configuration` — Manage global settings
- `search:confluence` — Search content
- `read:confluence-content.permission` — View content permissions
- `read:confluence-user` — Read user information
- `read:confluence-groups` / `write:confluence-groups` — Read/manage groups
- `readonly:content.attachment:confluence` — Download attachments

Atlassian recommends classic scopes when they cover an operation, but this integration also uses Confluence REST API v2 endpoints that require granular scopes. Add the Confluence API granular scopes below in the Atlassian Developer Console before running OAuth setup:

- `read:page:confluence`, `write:page:confluence`, `delete:page:confluence`
- `read:blogpost:confluence`, `write:blogpost:confluence`, `delete:blogpost:confluence`
- `read:space:confluence`
- `read:content:confluence`, `write:content:confluence`, `delete:content:confluence`
- `read:comment:confluence`, `write:comment:confluence`, `delete:comment:confluence`
- `read:attachment:confluence`, `write:attachment:confluence`, `delete:attachment:confluence`
- `read:content-details:confluence`, `read:hierarchical-content:confluence`
- `read:label:confluence`, `write:label:confluence`
- `read:content.property:confluence`, `write:content.property:confluence`
- `read:content.restriction:confluence`, `write:content.restriction:confluence`
- `read:content.permission:confluence`
- `read:user:confluence`, `read:group:confluence`

### Confluence Data Center

For personal use and scripts, basic authentication with a username and password, or a personal access token (available from Confluence Data Center 7.9) can be used. Personal access tokens are sent as `Authorization: Bearer <token>`.

Confluence Data Center also supports OAuth 2.0 via the Authorization Code Grant flow with PKCE. Implicit Grant and Resource Owner Password Credentials flows are not supported. OAuth 2.0 is configured by creating an incoming application link in Confluence's Administration > Application Links, which provides a Client ID and Client Secret.

## Features

### Pages and Blog Posts

Create, read, update, and delete pages and blog posts. Content can be authored in Confluence's storage format (XHTML-based). Pages support hierarchical organization with parent-child relationships, and can be moved or copied between spaces. Version history is maintained for all content.

### Spaces

Create and manage spaces, which are the top-level organizational containers for content. Spaces have configurable settings, themes, permissions, and properties. Space permissions can be managed to control which users and groups have access.

### Comments

Add, update, and delete comments on pages and blog posts. Supports both footer comments and inline comments.

### Attachments

Upload, download, update, and delete file attachments on pages and blog posts. Attachments support versioning.

### Labels

Add and remove labels on content and spaces for categorization and discovery.

### Search

The Confluence Query Language (CQL) allows complex searches using an SQL-like syntax. Search can filter by content type, space, labels, contributors, dates, and more.

### Content Properties

Content properties are key-value storage associated with a piece of Confluence content, useful for storing metadata. They can be read, created, updated, and deleted via the API.

### Content Restrictions

Manage read and update restrictions on individual pieces of content, controlling which users or groups can view or edit specific pages.

### Users and Groups

Read user details and group memberships. Create, update, and delete groups. Manage group membership.

### Whiteboards, Databases, and Folders (Cloud only, v2 API)

Create and manage whiteboards, databases, Smart Links in the content tree, and folders as content types within spaces.

### Tasks

View and update inline tasks (action items) within Confluence content.

### Templates

Manage content templates that provide pre-defined page structures.

### Audit Log (Admin)

View and export audit records for Confluence events. Create custom audit records.

### Space Permissions

View and manage granular space-level permissions for users and groups.

## Events

Webhooks allow you to notify an application or external service when certain events occur in Confluence, for example, to update an issue tracker or trigger notifications in a chat tool.

To create a webhook, provide a name, a callback URL, and the specific events to listen for. Confluence uses webhook secrets (HMAC) to authenticate payloads, ensuring message integrity.

On **Confluence Cloud**, webhooks can be registered via the REST API at `/wiki/rest/webhooks/1.0/webhook` or declared in a Connect app descriptor. On **Data Center**, webhooks can be registered via the UI (Administration > Webhooks) or via the REST API at `/rest/api/webhooks`.

Webhook payloads contain mostly IDs (to protect identifiable information); the REST API should be used to resolve these IDs into full data.

### Page Events

Triggered when pages are created, updated, moved, copied, trashed, restored, removed, archived, unarchived, or viewed. Also includes `page_children_reordered`, `page_published`, and `blueprint_page_created`.

- Events: `page_created`, `page_updated`, `page_moved`, `page_copied`, `page_trashed`, `page_restored`, `page_removed`, `page_archived`, `page_unarchived`, `page_viewed`, `page_children_reordered`, `page_published`, `blueprint_page_created`

### Blog Post Events

Triggered when blog posts are created, updated, moved, trashed, restored, removed, or viewed.

- Events: `blog_created`, `blog_updated`, `blog_moved`, `blog_trashed`, `blog_restored`, `blog_removed`, `blog_viewed`

### Comment Events

Triggered when comments are created or removed.

- Events: `comment_created`, `comment_removed`

### Attachment Events

Triggered when attachments are created, updated, removed, trashed, restored, archived, unarchived, or viewed.

- Events: `attachment_created`, `attachment_updated`, `attachment_removed`, `attachment_trashed`, `attachment_restored`, `attachment_archived`, `attachment_unarchived`, `attachment_viewed`

### Content Events (Generic)

Triggered for generic content lifecycle events and permission changes.

- Events: `content_created`, `content_updated`, `content_removed`, `content_trashed`, `content_restored`, `content_permissions_updated`

### Space Events

Triggered when spaces are created, updated, or removed, and when space permissions or logos change.

- Events: `space_created`, `space_updated`, `space_removed`, `space_permissions_updated`, `space_logo_updated`

### Label Events

Triggered when labels are added to or removed from content, and when labels are created or deleted globally.

- Events: `label_added`, `label_removed`, `label_created`, `label_deleted`

### User Events

Triggered when users are removed or reactivated.

- Events: `user_removed`, `user_reactivated`

### Group Events

Triggered when groups are created or removed.

- Events: `group_created`, `group_removed`

### Relation Events

Triggered when entity relationships are created or deleted.

- Events: `relation_created`, `relation_deleted`

### Search Events

Triggered when a search is performed.

- Events: `search_performed`

### Other Events

- `theme_enabled` — Triggered when a theme is enabled.
