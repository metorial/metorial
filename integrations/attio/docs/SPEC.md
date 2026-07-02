Now let me get the OAuth details and the full list of scopes.Now I have enough information to compile the specification. Let me note the key webhook event categories from the sidebar navigation: Call recording events, Comment events, List events, List attribute events, List entry events, Object attribute events, Note events, Note content events, Record events, Task events, Workspace member events. And Record events include: created, merged, updated, deleted.

# Slates Specification for Attio

## Overview

Attio is a customizable, data-driven CRM platform. The public API allows you to manipulate records, lists, notes, tasks and more. It allows developers to build apps that read and write information to and from Attio workspaces, and subscribe to events in realtime using webhooks.

## Authentication

Attio supports two authentication methods:

### 1. Access Tokens (API Keys)

There are two ways to authenticate with Attio: access tokens, or OAuth. Access tokens are scoped to a single workspace, while OAuth is only required if you plan on publishing an integration.

In order to generate an API key for your workspace, you must be an admin. From the dropdown beside your workspace name, click Workspace settings. Click the Developers tab. Click + New access token. Give your new access token a name. Set the appropriate Scopes for the token.

Tokens do not expire, but can be deleted at any time.

Your access token must be included in the Authorization header using the Bearer scheme. HTTP Basic Authentication is also supported (token as username, blank password) but Bearer is recommended.

By default, new access tokens don't have any scopes configured. You'll need to specify the scopes you need, which varies depending on the endpoints you're hitting - for example, reading a record requires both the "object configuration" and "record" scopes.

### 2. OAuth 2.0

Attio supports OAuth 2.0 using the Authorization Code Grant Flow (RFC 6749 section 4.1).

- **Authorization URL:** `https://app.attio.com/authorize`
- **Token URL:** `https://app.attio.com/oauth/token`
- Required parameters: `client_id`, `client_secret`, `redirect_uri`, `response_type=code`
- The token exchange uses `grant_type=authorization_code` with `Content-Type: application/x-www-form-urlencoded`.

For security reasons, new OAuth apps require publication approval before being usable across workspaces. While developing, your integration will be able to grant tokens for the workspace it is hosted in.

### Scopes

Scopes control access granularity. Known scopes include (based on API endpoint requirements): `object_configuration:read`, `record_permission:read`, `record:read`, `record:read-write`, `task:read`, `task:read-write`, `user_management:read`, `note:read`, `note:read-write`, `webhook:read`, `webhook:read-write`, `list:read`, `list:read-write`, `comment:read`, `comment:read-write`. Scopes are configured per token or per OAuth app.

## Features

### Record Management

Manage CRM records across customizable objects (e.g., People, Companies, Deals, and custom objects). Create, read, update, delete, and search/filter records. Records support an "assert" operation (upsert) that matches on a unique attribute (e.g., email address) to create or update without duplicates.

### Object & Attribute Configuration

Define and manage the data model of your workspace. Create custom objects and configure attributes (fields) on objects or lists. Supports various attribute types including text, email, domain, select, multi-select, currency, status, phone, checkbox, number, and rating. Attributes can be archived.

### Lists & Entries

Lists allow organizing records into structured collections (e.g., sales pipelines, recruitment pipelines). Add records to lists as entries, manage entry attributes, and query entries with filters. Entries can be asserted (upserted) by parent record.

### Notes

Create and manage notes attached to records. Notes reference a parent object and record. Supports reading, creating, and deleting notes.

### Tasks

Create and manage tasks within the workspace. Tasks can be assigned to workspace members and linked to records. Supports creating, listing, updating, and completing tasks.

### Comments & Threads

Manage threaded comments on records, notes, or other entities. Create, read, and delete comments within threads.

### Workspace Members

Read information about members of the workspace, including their roles and details.

### Meetings & Call Recordings

Access meeting data and call recording information including transcripts.

### Webhooks Management

Programmatically create, list, update, and delete webhook subscriptions. Subscriptions support filters (e.g., filtering events by specific object or record).

## Events

Attio supports webhooks for real-time event subscriptions. Webhooks are created via the API with a target URL and a list of event subscriptions, which can include filters. Subscriptions can filter events by fields like `parent_object_id` using operators such as `equals`.

The following webhook event categories are available:

### Record Events

Events for when records (people, companies, deals, custom objects) are created, updated, merged, or deleted. Update events include the specific attribute that changed.

### List Events

Events for when a list is created or updated (e.g., name or icon changes).

### List Entry Events

Events for when records are added to, updated within, or removed from lists.

### List Attribute Events

Events for changes to attribute definitions on lists.

### Object Attribute Events

Events for changes to attribute definitions on objects.

### Note Events

Events for when notes are created or updated. Note: body content updates do not currently trigger webhooks — this event is fired whenever the title of a note is modified. Body updates do not currently trigger webhooks.

### Note Content Events

Events related to note content changes (separate from title-level note events).

### Task Events

Events for when tasks are created, updated, or completed.

### Comment Events

Events for when comments are created, updated, or deleted.

### Call Recording Events

Events related to call recording activity.

### Workspace Member Events

Events for changes to workspace membership.
