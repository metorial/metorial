Now let me get more details on the API features, particularly around tables, records, columns, and access control:Now let me check if Grist has self-hosted server URL requirements and document sharing/access control via API:I now have enough information to write the specification.

# Slates Specification for Grist

## Overview

Grist is an open-source relational spreadsheet-database hybrid that combines the flexibility of spreadsheets with the structure of databases. It offers a REST API for programmatically managing organizations (team sites), workspaces, documents, tables, records, columns, and attachments. Grist can be used as a hosted service at getgrist.com or self-hosted.

## Authentication

Access to the Grist API is controlled by an Authorization header, which should contain the word 'Bearer', followed by a space, followed by your API key.

**API Key Authentication:**

- **Type:** Bearer token (API key)
- **Header:** `Authorization: Bearer <API_KEY>`
- An API key is owned by a single user, and has the same permissions as that user. To enable API access, visit your Profile Settings.
- Public documents may be accessed without an API key.

**Server URL:**

The API base URL depends on how Grist is deployed:

- The server URL is `docs.getgrist.com` if you're not using a team, and `teamname.getgrist.com` if you are on a team.
- For self-hosted instances, provide your Grist Self-Hosted URL (e.g., `https://grist.example.com`).

The full API base URL follows the pattern: `https://<host>/api`

**Required inputs:**

- **API Key:** Generated from Profile Settings in the Grist UI.
- **Server URL:** The base URL of the Grist instance (e.g., `https://docs.getgrist.com`, `https://myteam.getgrist.com`, or a self-hosted URL).

There are no OAuth2 flows or scopes. The API key inherits all permissions of the user who generated it.

## Features

### Organization (Team Site) Management

Manage team sites and personal spaces. Team sites and personal spaces are called 'orgs' in the API. You can list all accessible orgs, retrieve details about a specific org, modify org settings, and get usage statistics for all non-deleted documents in the organization.

### Workspace Management

Sites can be organized into groups of documents called workspaces. You can create, list, rename, and delete workspaces. Deleted workspaces go to trash and can be restored or permanently deleted.

### Document Management

A unified endpoint for creating documents. Can create an empty document, copy an existing document, or import a file. Documents can be described, updated, moved between workspaces, pinned, downloaded (as `.grist` or `.sqlite` files), soft-deleted and restored, or permanently deleted.

### Table Management

Documents are structured as a collection of tables. You can list, create, and modify tables within a document. Table metadata such as table IDs can be updated.

### Column Management

Tables are structured as a collection of columns. You can list, create, update, and delete columns. Columns support types such as Text, Integer, Numeric, Date, DateTime, Choice, Ref, RefList, Attachments, and more. Column configuration includes widget options (e.g., choice lists and colors).

### Record (Row) Management

Tables contain collections of records (also called rows). You can fetch, add, update, and delete records. Records support filtering by column values, sorting (ascending/descending with options like natural sort and empty-last), and limiting result count. An "add or update" operation is available: first, we check if a record exists matching the values specified for columns in require. If so, we update it. If not, we create a new record with a combination of the values in require and fields.

### Attachment Management

Documents may include attached files. Data records can refer to these using a column of type Attachments. You can upload files, list attachment metadata, download individual attachments, and download all attachments as an archive. Unused attachments can be cleaned up to free storage.

### SQL Queries

Execute a read-only SQL SELECT query against the document's SQLite database. This is a simplified endpoint for basic queries. Parameterized queries are supported via a POST endpoint. Only SELECT statements are allowed; modifications are not permitted.

### User Actions (Batch Operations)

Apply a sequence of user actions to a document. This is a low-level endpoint for making batch changes using Grist's internal action format. Supports adding, updating, removing, and renaming records, columns, and tables in a single request.

### Webhook Management

Creates one or more webhooks that will POST to specified URLs when data in the document changes. You can list, create, update, and delete webhooks, as well as clear pending delivery queues.

### User Management

You can retrieve information about the current user and delete user accounts. This action also deletes the user's personal organisation and all the workspaces and documents it contains. Currently, only the users themselves are allowed to delete their own accounts.

## Events

Grist supports outgoing webhooks that notify external services when data changes in a document.

### Row Added

Triggers when new rows are added to a specified table. The webhook payload contains a JSON array of the newly added row data.

- **Table:** The specific table to monitor.
- **Ready Column (optional):** A boolean column that gates when the webhook fires, allowing you to control timing of delivery.

### Row Updated

Triggers when existing rows are modified in a specified table.

- **Table:** The specific table to monitor.
- **Filter for changes in these columns (optional):** A semicolon-separated list of column IDs. If an existing row is edited, the webhook will trigger only if one of the filtered columns was changed.
- **Ready Column (optional):** A boolean column that gates when the webhook fires.

**General webhook configuration options:**

- **URL:** The endpoint to receive the POST payload.
- **Name / Memo:** Descriptive labels for the webhook.
- **Enabled state:** Webhooks can be enabled or disabled.
- Multiple rows can simultaneously trigger the same webhook. In that case, those rows will be sent together in the same payload.
- If a webhook fails to deliver its payload to the specified URL, it will keep retrying periodically.
