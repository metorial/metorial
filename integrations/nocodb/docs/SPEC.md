Now let me fetch the API documentation to understand the full scope of features:I have sufficient information. Let me compile the specification.

# Slates Specification for NocoDB

## Overview

NocoDB is an open-source no-code platform that turns any relational database (MySQL, PostgreSQL, SQL Server, MariaDB, SQLite) into a spreadsheet-like interface. It is a no-code database platform that allows teams to collaborate and build processes with a familiar spreadsheet interface. It provides REST APIs to programmatically manage workspaces, bases, tables, fields, records, views, and webhooks.

## Authentication

NocoDB uses **API Token** authentication. API Tokens do not expire, but can be deleted anytime.

**Generating an API Token:**
Log into NocoDB and select the User menu in the bottom left sidebar, then select Account Settings and open the Tokens tab. Select "Add new API token", enter a name for your token, select Save, and copy the API Token.

**Using the API Token:**

NocoDB supports two methods for API token authentication:

1. **`xc-token` header**: Pass the token directly as `xc-token: <your_api_token>`.
2. **`Authorization` header**: Use the standard Bearer format: `Authorization: Bearer <your_api_token>`.

Both methods are equivalent.

**Base URL:**
NocoDB can be self-hosted or used via NocoDB Cloud. The base URL depends on the instance: for self-hosted it would be something like `http://localhost:8080`, and for NocoDB Cloud it would be the cloud domain. The host of the NocoDB instance must be provided, for example `http://localhost:8080`.

**Note:** NocoDB previously supported user auth tokens (JWT-based temporary tokens valid for a session), but deprecated them in v0.205.1. API tokens should be used instead.

## Features

### Workspace Management

Manage workspaces that serve as top-level organizational containers. Workspace ID is an alphanumeric identifier prefixed with `w` that uniquely identifies a workspace. Workspaces contain bases and members with role-based access.

### Base (Database) Management

Create, read, update, and delete bases within workspaces. A base uniquely identifies a specific database within your workspace. Bases can be backed by NocoDB's built-in storage or connected to external data sources like PostgreSQL or MySQL.

### Table Management

Basic operations include creating, reading, updating, and deleting tables. Tables are the core data containers within a base and hold records organized by fields (columns).

### Field (Column) Management

Create and manage fields on tables. NocoDB supports a wide variety of field types including simple text and numbers, attachments, links to other tables, formulas, and more. Supported types include: SingleLineText, LongText, Number, Decimal, Currency, Percent, Email, URL, Checkbox, SingleSelect, MultiSelect, Date, DateTime, Attachment, LinkToAnotherRecord, Lookup, Rollup, Formula, Rating, Duration, Barcode, QrCode, JSON, User, Button, and others.

### Record (Row) Operations

Full CRUD operations on records within tables. Records can be queried with filtering (via `where` clauses), sorting, and field selection. Linked records between tables can be managed (link/unlink). Supports both single and bulk operations for inserting, updating, and deleting records.

### View Management

Multiple view types are supported: Grid (default), Gallery, Form, Kanban, and Calendar views. Views provide filtered, sorted, and customized perspectives of table data. Views are read-only — they provide query capabilities but record creation or updates happen at the table level. Views can be shared publicly or privately (with password protection).

### Form Views

Form views allow data collection through configurable forms. NocoDB supports pre-filling form fields with specific values by setting URL parameters. Forms support conditional fields, custom appearance settings, and post-submission actions.

### Data Source Connections

For external data sources connected to NocoDB (such as Postgres or MySQL), a Data Source ID is additionally required to perform data API operations. This allows NocoDB to act as an API layer on top of existing databases.

### Collaboration & Access Control

Fine-grained access control with roles is available at different levels. Users can be invited to workspaces and bases with specific roles. User management includes listing members and managing their permissions.

### Webhook Management

Webhooks can be created, updated, deleted, and listed programmatically via the API. Webhooks are configured per table and can be managed with custom payloads, headers, and event-specific triggers. Webhooks can also be managed via the API without using the UI.

### Attachment Storage

Files can be uploaded and attached to records via Attachment fields. Attachments are stored and accessible through the API.

### Shared Views

Bases and views can be shared either publicly or privately with password protection, enabling external access to data without requiring full authentication.

## Events

NocoDB supports webhooks that can be configured per table to notify external systems of changes.

### Record Events

Triggers when a record is inserted, updated, or deleted, or for all actions if "Send me everything" is selected.

- **After Insert**: Fires when one or more records are created in the table.
- **After Update**: Fires when one or more records are updated. Field-specific triggers can be configured so webhooks fire only when certain fields are changed. For record update events, you can optionally select which fields should trigger the webhook.
- **After Delete**: Fires when one or more records are deleted.
- **Send Everything**: A "Send everything" trigger option allows configuring a webhook that triggers on any change to records within a table without having to specify individual event types.

Conditions can be applied to record events using logical operators (AND/OR) to trigger only when specific field values are met. Webhooks can be configured to trigger only when specific conditions are met, and will only fire if the condition transitions from not met to met during a record event.

### View Events (Enterprise only)

Triggers when a view is created, updated, or deleted, or for all actions if "Send me everything" is selected. This trigger source type is only available in cloud and self-hosted enterprise plans.

### Field Events (Enterprise only)

Triggers when a field is created, updated, or deleted, or for all actions if "Send me everything" is selected. This trigger source type is only available in cloud and self-hosted enterprise plans.

### Manual / Button Trigger

Trigger runs when a user manually clicks a webhook-configured button. This is used in conjunction with the Button field type to allow user-initiated webhook calls from within the table UI.
