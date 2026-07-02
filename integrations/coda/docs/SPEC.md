Now let me check the Coda API authentication details and webhook specifics more closely:Now let me check the Coda API's authentication section and the webhook API for docs specifically:Now I have enough information to write the specification. Let me compile all the findings:

# Slates Specification for Coda

## Overview

Coda is a collaborative document platform that combines documents, spreadsheets, and application-like functionality into a single workspace. It provides a REST API (v1) for programmatic access to docs, pages, tables, rows, formulas, controls, and permissions. An additional Admin API is available for enterprise organizations to manage workspaces, audit events, and organizational policies.

## Authentication

Coda uses **API token authentication** via Bearer tokens. There is no OAuth2 flow for the Coda API itself.

**Generating a token:**

1. Navigate to your Coda account settings (click your avatar → Account Settings).
2. Scroll to the **API Settings** section and click **Generate API Token**.
3. Provide a name for the token and optionally add restrictions to limit its scope (e.g., restrict to specific docs or specific actions like read-only).
4. Copy the generated token.

**Using the token:**

All API requests must include the token in the `Authorization` header:

```
Authorization: Bearer <your API token>
```

**Base URL:** `https://coda.io/apis/v1`

**Token restrictions:** Tokens can optionally be restricted to only allow certain actions on certain objects. By default, an unrestricted token can perform any action the user's account has access to. The token's capabilities are also subject to the user's role in the workspace (e.g., creating docs requires the Doc Maker or Admin role).

**Admin API (Enterprise only):** Enterprise organizations have access to a separate Admin API at `https://coda.io/apis/admin/v1`, which uses the same Bearer token authentication but requires the user to be an organization admin.

## Features

### Folder Management

Create, list, update, and delete folders within workspaces to organize docs. Folders belong to a specific workspace.

### Doc Management

List, create, update, and delete Coda docs. Docs can be created from scratch or copied from an existing doc. Docs can be searched and filtered by ownership, workspace, folder, published status, and starred status. Creating a doc requires the Doc Maker role in the target workspace.

### Doc Sharing and Permissions

Manage sharing permissions on docs, including adding and removing access for individual users or groups. Supports read-only, write, and comment access levels. ACL settings can be configured to control whether editors can change permissions, viewers can copy the doc, or viewers can request editing access. Principals (users and groups) can be searched for sharing purposes.

### Doc Publishing

Publish and unpublish docs. Published docs can be configured with a slug, discoverability settings, interaction mode (view, play, edit), and category assignments.

### Page Management

List, create, update, and delete pages within a doc. Pages support rich text content (HTML), subtitles, icons, cover images, and hierarchical nesting via parent pages. Page content can be read, appended to, or deleted. Page content can be exported to HTML or Markdown format.

### Table and View Access

List and retrieve metadata about tables and views within a doc, including column definitions, row counts, layout types, sorts, and filters. Tables support various layout types including default, calendar, card, Gantt chart, form, and various chart types.

### Row Operations

Read, insert, update, upsert, and delete rows in tables. Rows can be queried by column value. Upserting is supported by specifying key columns for matching. Cell values can be returned in simple, array, or rich (JSON-LD) formats. Row insertion and upserting only work on base tables, not views.

- **Sync tokens** can be used to retrieve only rows changed since a previous request.

### Button Pushing

Programmatically trigger button columns on specific rows. The button can perform any action configured in the doc, including writing to other tables or executing Pack actions.

### Formulas and Controls

List and read named formulas and their computed values within a doc. List and read controls (interactive inputs like sliders, checkboxes, date pickers, select boxes) and their current values.

### Automation Triggering

Trigger webhook-invoked automations within a doc by POSTing a JSON payload to a specific automation rule endpoint. The payload is accessible within the automation as a step result.

- Automations must be pre-configured in the doc with a "Webhook invoked" trigger.

### Analytics

Retrieve usage analytics for docs and Packs, including views, sessions, copies, likes, and AI credit usage. Data can be filtered by date range, workspace, and other criteria. Page-level analytics are available for Enterprise workspaces. Pack analytics include formula invocation counts, install counts, and revenue data.

### URL Resolution

Resolve a browser link to a Coda resource (doc, page, table, etc.) into its API representation, useful for converting user-provided URLs into API-addressable resources.

### Mutation Status Tracking

Check the completion status of asynchronous write operations using a request ID returned from mutation endpoints. Write operations (inserts, updates, deletes) are asynchronous and return HTTP 202.

## Events

### Doc-Level Webhooks (Standard API)

The Coda API supports outbound webhooks at the doc level. Webhooks can be registered on a specific doc to receive notifications when data changes occur.

- **Supported event types:** `rowAdded`, `rowUpdated`, `rowRemoved`.
- **Configuration:** Webhooks are created per doc, specifying an endpoint URL and the desired event types.
- Webhooks can be listed, updated, and deleted.

### Audit Event Webhooks (Admin API — Enterprise Only)

Enterprise organizations can subscribe to audit event webhooks through the Admin API. These webhooks push notifications of organizational audit events to a registered endpoint.

- Requires an initial handshake: Coda sends an HTTP GET with an `X-Webhook-Code` header to the target URL, which must echo it back.
- Events are delivered via HTTP POST with signature verification using `X-Webhook-Signature` (HMAC SHA256).
- Events are delivered in batches within a few minutes of occurrence.
- After 8 hours of consecutive delivery failures, the webhook is automatically disabled.

### Inbound Webhook Automations

Coda supports inbound webhooks that trigger doc automations when an external service sends a POST request. These are not subscriptions to Coda events, but rather a mechanism for external systems to push data into Coda docs and trigger configured automation workflows.
