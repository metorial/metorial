Let me fetch the Airtable developer docs for more details on OAuth and webhooks specifications.The Airtable developer docs pages are rendered client-side. Let me fetch alternative sources for OAuth and webhook details.Now let me get the Airtable API scopes list and more detail on the API features.I now have sufficient information. Let me compile the specification.

# Slates Specification for Airtable

## Overview

Airtable is a low-code platform that combines spreadsheet and database functionality, allowing users to create relational databases with a visual interface. It provides a RESTful Web API for programmatic access to bases, tables, records, and metadata, as well as an Enterprise API for administrative operations.

## Authentication

Airtable supports two authentication methods. Legacy API keys were fully deprecated on February 1, 2024.

### 1. Personal Access Tokens (PAT)

For individual use, users should use Personal Access Tokens. Unlike legacy API keys, which have the same access as your Airtable account, you can limit and configure the access of your personal access tokens by selecting the scopes (what endpoints the token can use) and access/resources (which bases and workspaces the token can access) when creating or updating a token.

- **Creation:** To access your PATs, open the developer hub and click "Personal access tokens" under the "Developers" section.
- **Token format:** `patAbCdEfGh1234567.1234567890abcdefghijklmnopqr`
- **Usage:** Include the token as a Bearer token in the `Authorization` header: `Authorization: Bearer YOUR_PAT`
- **Base URL:** `https://api.airtable.com/v0/{baseId}/{tableNameOrId}`
- **Access configuration:** Choose from a single base, multiple bases (even bases from different workspaces), all of the current and future bases in a workspace you own, or all of the bases from any workspace that you own including bases/workspace added in the future.
- Personal access tokens do not expire but can be revoked at any time from the token management page.

### 2. OAuth 2.0 (Authorization Code with PKCE)

OAuth is recommended for third-party integrations.

- **Registration:** Register a new integration at https://airtable.com/create/oauth. You will receive a Client ID and can optionally generate a Client Secret.
- **Authorization endpoint:** `https://airtable.com/oauth2/v1/authorize`
- **Token endpoint:** `https://airtable.com/oauth2/v1/token`
- **PKCE:** Airtable uses PKCE (code_challenge and code_verifier). The code_challenge is sent during authorization, and the original code_verifier must be presented when exchanging the authorization code for an access token. Airtable re-computes and verifies the challenge.
- **Scopes:** Space-delimited list. Common scopes include:
  - `data.records:read` — Read records
  - `data.records:write` — Create, update, delete records
  - `data.recordComments:read` — Read comments
  - `data.recordComments:write` — Write comments
  - `schema.bases:read` — Read base schema
  - `schema.bases:write` — Create/modify tables and fields
  - `webhook:manage` — Create and manage webhooks
  - `user.email:read` — Read user email
- **Resource selection:** During authorization, users can view the third-party requesting access, a list of actions the third party is requesting, and a list of workspaces and bases that an integration can access. Users select which bases or workspaces to grant access to.

## Features

### Record Management

The core feature of the Airtable API. Allows creating, reading, updating, and deleting records in any table within a base. Records can be filtered using Airtable formulas (filterByFormula), which evaluate each record and include it if the result is truthy. Filters can be combined with view parameters. Records can also be sorted by one or more fields and scoped to a specific view. The `typecast` parameter enables automatic data conversion from string values. An `upsert` operation is available to find, create, or update records in a single call.

### Base and Schema Management

You can programmatically create Airtable bases, tables, and fields. Note that some advanced field types such as formulas cannot be created via API. Listing and removing views is also supported programmatically. The schema API allows reading base structure including table names, field names, field types, and view definitions.

### Record Comments

The API allows reading and writing comments on individual records. Requires the `data.recordComments:read` and `data.recordComments:write` scopes respectively.

### Collaborator Management

You can add a single user to a base or a workspace, and update user permissions on a base or workspace.

### User Information

The API provides endpoints to retrieve the current user's ID and, if connected via OAuth, the list of granted scopes. The Enterprise API allows teams to manage their account programmatically outside of the Admin panel UI through actions like managing users, updating access permissions, and managing bases, tables, and views.

### Data Sync (CSV)

The Sync API feature allows users to sync CSV data with up to 10,000 rows per request instead of 10 records per request using the regular create or update records JSON endpoints.

### Enterprise Administration

Available only on Enterprise plans. Provides programmatic access to enterprise-level operations including user management (fetching user info, unsharing users from workspaces/bases), audit logging, and organization-wide settings.

## Events

The Webhooks API allows developers to be notified in real-time about changes in their base, from newly created records to a field being updated in an existing record, to a record moving in or out of a view.

Webhooks are created per base via the API. When creating a webhook, the return value will contain a unique MAC secret that must be saved to validate payloads. Airtable sends a lightweight POST notification to the registered URL, and the actual change payloads must then be fetched separately via the API using a cursor-based mechanism.

Webhooks have an expiration time and must be periodically refreshed to remain active.

### Event Filtering

Webhooks are configured with a specification that controls which data types to monitor. The `dataTypes` filter accepts:

- **`tableData`** — Notifications for record-level changes: records created, updated, or deleted.
- **`tableFields`** — Notifications for field-level changes, such as when a field is created, updated, or deleted.
- **`tableMetadata`** — Notifications for table-level changes, such as tables being created, renamed, or deleted.

### Scope Filtering

The `recordChangeScope` parameter allows limiting monitoring to a specific table ID. Leave empty to monitor all tables in the base.

### Webhook Security

Notifications can be validated using the `X-Airtable-Content-MAC` header and the MAC secret provided when the webhook was created.
