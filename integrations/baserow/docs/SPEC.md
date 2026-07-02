Let me get more details on the webhook event types and the full API capabilities.Now let me fetch the webhooks page to get the complete list of event types:Now I have all the information I need. Let me compile the specification.

# Slates Specification for Baserow

## Overview

Baserow is an open-source, no-code database platform that combines spreadsheet-like interfaces with relational database capabilities. It is available as a hosted cloud service (baserow.io) or as a self-hosted deployment. It provides REST APIs for managing workspaces, databases, tables, fields, rows, views, file uploads, and webhooks.

## Authentication

Baserow supports two authentication methods:

### 1. Database Token (API Token)

Database tokens are permanent API keys that let you securely connect external applications to your Baserow data. Create tokens to authenticate API requests for reading, writing, updating, and deleting data without sharing your login credentials.

- Each database token is scoped to a single workspace. Database tokens authenticate you across all databases in the selected workspace you have access to.
- Permissions can be set to create, read, update, delete per table.
- Database tokens only allow reading or manipulating the data of a table. If you want to create, update or delete the structure of the table, you need a JWT token.
- Tokens are created in the Baserow UI under account Settings > Database Tokens.
- All API requests must use HTTPS and must include the database token in the Authorization header.
- Header format: `Authorization: Token YOUR_DATABASE_TOKEN`

### 2. JWT (JSON Web Token)

Use JWTs when you want to authenticate and manage user access to Baserow's web interface or when making authenticated API requests as a user, and when you want to access Baserow as a whole, like logging in, navigating around, or doing different tasks within Baserow.

- Obtain a JWT by sending a POST request to `/api/user/token-auth/` with `username` (email) and `password`.
- You can simply provide an Authorization header containing `JWT {TOKEN}` to authorize. The token will be valid for 60 minutes and can be refreshed before that time using the token refresh endpoint.
- JWT authentication provides access to the full API surface, including structural operations (creating/modifying tables, fields, workspaces, etc.).

**Note for self-hosted instances:** The base URL will be the URL of your own Baserow instance rather than `https://api.baserow.io`.

## Features

### Workspace Management

Workspaces are the top-level organizational unit. You can create, list, update, and delete workspaces. A workspace can contain multiple applications. It can be used to define a company, and it is possible to invite additional users to a workspace. Every user in the workspace has access to all the applications within that workspace. Requires JWT authentication.

### Database & Table Management

Create and manage databases within workspaces. Each database contains tables with customizable schemas. You can create tables, modify their structure, and import data from CSV. Baserow automatically generates REST API documentation for every database you create. Structural changes (creating/deleting tables, fields) require JWT authentication.

### Field Management

Tables support a wide variety of field types: text, number, boolean, date/time, URL, email, file, single/multiple select, link-to-table, lookup, rollup, count, formula, collaborator, rating, duration, autonumber, UUID, password, AI prompt, and more. Fields can be created, updated, and deleted via the API. Requires JWT authentication.

### Row Operations (CRUD)

Baserow provides REST APIs for all database operations using token-based authentication. Access auto-generated docs through your database settings, authenticate with tokens, and use standard HTTP methods for CRUD operations on tables and rows.

- Supports filtering with AND/OR logic, full-text search, sorting, and field selection.
- You can use view-based scoping that only applies to rows matching view filters.
- Row operations work with both Database Tokens and JWT authentication.

### View Management

Views provide different ways to display and interact with table data. Supported view types include Grid, Gallery, Form, Kanban, Calendar, and Timeline. Views support filters, sorting, grouping, and row coloring. You can share views publicly. Requires JWT authentication for creation/modification.

### File Uploads

If you're using the Baserow API for your application and need to upload files programmatically, you can use the file field. Baserow is API-first and developer-friendly, so it supports uploading files via API. Files can be uploaded via multipart form data or by providing a URL for Baserow to download from.

### Webhook Management

Webhooks can be created, updated, listed, and deleted via the API. Each webhook is scoped to a table and can be configured to trigger on specific event types. Custom HTTP headers and HTTP methods (GET, POST, PUT, PATCH, DELETE) can be configured per webhook.

### Application Builder

Baserow includes a no-code application builder for creating custom front-end applications backed by Baserow databases. Applications can be published to custom domains and include user authentication via User Sources.

### Automation Builder

Baserow provides a built-in workflow automation builder with triggers and actions for automating tasks within and across databases.

## Events

Baserow supports webhooks that send real-time HTTP notifications to a configured URL when specific events occur in a table.

### Row Events

- **Rows created** (`rows.created`): Triggers when new rows are added to the table. The payload includes the full data of all created rows.
- **Rows updated** (`rows.updated`): Triggers when existing rows are modified. The payload includes both the current (`items`) and previous (`old_items`) state of the rows, enabling change detection.
- **Rows deleted** (`rows.deleted`): Triggers when rows are removed from the table.

### View Events

- **View created** (`view.created`): Triggers when a new view is added to the table.
- **View updated** (`view.updated`): Triggers when a view's configuration is changed.
- **View deleted** (`view.deleted`): Triggers when a view is removed.

### Field Events

- **Field created** (`field.created`): Triggers when a new field is added to the table.
- **Field updated** (`field.updated`): Triggers when field properties are changed.
- **Field deleted** (`field.deleted`): Triggers when a field is removed.

### Advanced Events

- **Conditional row update**: Triggers only when specific field values change, allowing fine-grained control over which updates fire the webhook.
- **Row enters view**: Triggers when a row starts matching a view's filter conditions, useful for monitoring when rows meet certain criteria.

### Webhook Configuration Options

- Webhooks are scoped to a specific table.
- Custom HTTP headers can be added (e.g., for authentication with the receiving endpoint).
- HTTP method is configurable (GET, POST, PUT, PATCH, DELETE).
- A "Send everything" option can be selected to subscribe to all event types at once.
- Baserow provides a call log for monitoring webhook delivery and debugging failures.
- Baserow automatically retries failed webhook calls a limited number of times.
