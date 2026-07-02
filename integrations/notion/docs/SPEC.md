# Slates Specification for Notion

## Overview

Notion is an all-in-one workspace application that combines notes, tasks, wikis, and databases. Its API exposes endpoints to read, create, update, and delete pages, databases, users, and other resources in a Notion workspace. It also offers a SCIM API for user and group management within enterprise workspaces.

## Authentication

Notion supports two authentication methods, depending on the integration type:

### 1. Internal Integration Token (API Key / Bearer Token)

Internal Integrations are exclusive to a single workspace, accessible only to its members. Internal integrations use a simpler authentication process (the integration secret) and don't require any security review before publishing.

- Create an integration at `https://www.notion.so/profile/integrations`.
- Select the Secrets tab and copy the Internal Integration Token.
- Requests use the HTTP Authorization header with a bearer token to authenticate.
- Before an integration can interact with your Notion workspace page(s), the page must be manually shared with the integration.

### 2. OAuth 2.0 (Public Integrations)

Public Integrations are designed for a wider audience, usable across any Notion workspace, and follow the OAuth 2.0 protocol for workspace access.

- **Authorization URL:** `https://api.notion.com/v1/oauth/authorize`
- **Token URL:** `https://api.notion.com/v1/oauth/token`
- **Required credentials:** Client ID and Client Secret, obtained from the integration's settings page.
- You will need to fill out the form with additional information, including your company name, website, and redirect URI(s).
- The token exchange uses HTTP Basic Authentication with base64-encoded `client_id:client_secret`.
- Notion responds with an access_token, refresh_token, and additional information. The access_token is used to authenticate subsequent API requests. The refresh_token is used to refresh the access token.
- During the OAuth flow, a page picker interface opens where the user can search for and select pages and databases to share with the integration.

### Capabilities (Scopes)

Instead of traditional OAuth scopes, Notion uses "capabilities" configured in the integration settings:

- **Read content:** Gives an integration access to read existing content in a Notion workspace.
- **Update content:** Gives an integration permission to update existing content.
- **Insert content:** Gives an integration permission to create new content.
- **Read comments:** Gives the integration permission to read comments from a page or block.
- **Insert comments:** Gives the integration permission to insert comments in a page or in an existing discussion.
- **User information:** Three levels — no user information, read user info without email, or read user info including email.

## Features

### Page Management

Create, retrieve, update, and archive pages. Pages can exist as standalone pages or as entries within databases. Content within pages is structured around "blocks" — the basic units of content. Whatever you add to the page is a block: a paragraph, a list, a table, and so on. Each block can be standalone or have child blocks.

### Block Management

Retrieve, update, delete, and append blocks within pages. Blocks represent all content types including paragraphs, headings, lists, to-dos, callouts, code blocks, images, embeds, and more. Blocks can be nested (child blocks within parent blocks).

### Database Management

Databases are core to how information is stored in Notion. With the API, you can pull specific database entries, search a list of specific database entries based on properties, and get a list of all entries in a database. You can also create databases, update their schema (add/remove/rename properties), and query them with filters and sorts. Supported property types include text, number, select, multi-select, date, people, files, checkbox, URL, email, phone, formula, relation, rollup, and more.

### Comments

Notion offers the ability for developers to add comments to pages and page content (blocks) within a workspace. Users may add comments to the top of a page or inline to text or other blocks within a page. You can read open comments on a block or page. Integrations cannot start a new discussion thread, edit existing comments, or retrieve resolved comments.

### Search

Search across pages and databases by title that the integration has access to. The search endpoint works best when querying for pages and databases by name. It is not optimized for exhaustively enumerating all documents a bot has access to. Search is not guaranteed to return everything.

### User Management

For teams of all sizes, seeing admins, members, and guests in your workspace helps foster transparency. With Notion's API, you can get a list of all workspace users. You can retrieve individual user profiles including name, avatar, and optionally email address.

### File Uploads

Upload files to pages or blocks in Notion.

### Data Sources

In newer API versions (2025-09-03+), Notion introduced support for multi-source databases, allowing databases to have multiple data sources, each with its own schema and entries.

## Events

Notion supports webhooks for real-time event notifications. Webhooks let your integration receive real-time updates from Notion. Whenever a page or database changes, Notion sends a secure HTTP POST request to your webhook endpoint.

Webhook subscriptions are created via the integration settings UI (not via API). You enter a public Webhook URL — a secure (HTTPS), publicly available endpoint. A one-time verification token is sent to the endpoint, which must be confirmed in the Notion UI to activate the subscription. Notion webhooks use sparse payloads — each event delivers metadata (event type, entity ID, timestamp) and expects your integration to call the Notion API to fetch the actual data. This keeps payloads lightweight.

Notion webhooks require your integration to have explicit access to each page or database it wants to monitor. You can't set up a single subscription that automatically receives events for everything in a workspace.

Integration webhooks currently do not support notifications for user changes (including workspace membership changes, email/name updates, and permission modifications).

### Page Events

- **`page.content_updated`**: Fired when a page's content (including title) is modified. This is an aggregated event — it is batched and may not be sent immediately.
- **`page.created`**: Fired when a new page is created within a page or database the integration has access to.
- **`page.locked` / `page.unlocked`**: Fired when a page is locked or unlocked. These are non-aggregated (sent instantly).

### Comment Events

- **`comment.created`**: Fired when a new comment is added. To receive this event, your integration must include the "comment read" capability. This is a non-aggregated event delivered within seconds.

### Database / Data Source Schema Events

- **`data_source.schema_updated`** (API version 2025-09-03) or **`database.schema_updated`** (older versions): Fired when a database schema changes — for example, when a property is added, renamed, or deleted.
