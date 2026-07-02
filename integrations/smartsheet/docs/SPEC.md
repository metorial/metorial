Now let me get the full list of OAuth scopes:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Smartsheet

## Overview

Smartsheet is a cloud-based work management and collaboration platform that organizes work into spreadsheet-like "sheets" with rows, columns, and cells. It provides features for project management, task tracking, file attachments, discussions, dashboards, reports, and sharing. The API allows programmatic access to manage sheets, rows, columns, workspaces, folders, users, and related resources.

## Authentication

Smartsheet supports two authentication methods. Both require an `Authorization: Bearer <access_token>` HTTP header on every API request.

### 1. API Access Token (Personal Access Token)

For machine-to-machine scenarios without user interaction, you can use a raw access token over HTTPS. To generate a token, go to Personal Settings in the Smartsheet UI and navigate to the API Access tab, then select "Generate new access token." The token value is only shown once at generation time and must be copied and stored safely. These tokens do not expire automatically but can be revoked.

### 2. OAuth 2.0 (Authorization Code Flow)

Smartsheet implements OAuth 2.0 as a 3-legged process requiring user interaction. OAuth provides a way for app users to grant limited access to their Smartsheet resources.

**Endpoints:**

- Authorization URL: `https://app.smartsheet.com/b/authorize`
- Token URL: `https://api.smartsheet.com/2.0/token`

**Setup:** You must register as a developer and create an app in the Smartsheet Developer Tools UI, which provides a **client ID** and **client secret**.

**Flow:**

1. Redirect the user to the authorization URL with `response_type=code`, `client_id`, and `scope` (space-delimited list of scopes).
2. User grants consent; Smartsheet redirects back with an authorization `code`.
3. Exchange the code for an access token via `POST /token` with `grant_type=authorization_code`.
4. Access tokens expire after approximately 7 days. Use the refresh token with `grant_type=refresh_token` to obtain a new token pair.

**Available Scopes:**

| Scope              | Description                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `READ_SHEETS`      | Read all sheet data, including attachments, discussions, and cell data          |
| `WRITE_SHEETS`     | Insert and modify sheet data, including attachments, discussions, and cell data |
| `CREATE_SHEETS`    | Create new sheets                                                               |
| `DELETE_SHEETS`    | Delete sheets                                                                   |
| `SHARE_SHEETS`     | Share sheets, including sending sheets as attachments                           |
| `ADMIN_SHEETS`     | Modify sheet structure, including column definition and publish state           |
| `READ_SIGHTS`      | Read all dashboard data                                                         |
| `CREATE_SIGHTS`    | Create new dashboards                                                           |
| `DELETE_SIGHTS`    | Delete dashboards                                                               |
| `SHARE_SIGHTS`     | Share dashboards                                                                |
| `ADMIN_SIGHTS`     | Modify dashboard structure                                                      |
| `READ_USERS`       | Retrieve users and groups for the organization account                          |
| `ADMIN_USERS`      | Add and remove users; create groups and manage seat types                       |
| `READ_CONTACTS`    | Retrieve contacts                                                               |
| `READ_EVENTS`      | Retrieve events                                                                 |
| `ADMIN_WEBHOOKS`   | Create, delete, and update webhooks; get all webhooks                           |
| `ADMIN_WORKSPACES` | Create and manage workspaces and folders, and their shares                      |

## Features

### Sheet Management

Create, read, update, and delete sheets. Sheets are the core data structure in Smartsheet, similar to spreadsheets with rows and columns. You can manage columns (including various types such as text, date, contact list, picklist, checkbox), add/update/delete rows, and manipulate individual cell values. Smartsheet also supports system columns that are automatically filled by the platform. Sheets can be copied, moved, and imported from external formats (CSV, Excel).

### Row and Cell Operations

Add, update, move, and delete rows within sheets. Rows can be positioned at specific locations (top, bottom, relative to a sibling or parent row). You can create and modify hyperlinks within cells, add images to cells, and work with cross-sheet references. Cell values support strict or lenient parsing modes for data type validation.

### Workspaces and Folders

Organize sheets, reports, and dashboards into workspaces and folders. Create, update, delete, and share workspaces and folders. Workspaces serve as top-level organizational containers with their own sharing permissions.

### Attachments

The API allows uploading files to sheets, rows, and comments via simple or multipart uploads. The maximum file size for uploads is 30 MB.

### Discussions and Comments

A discussion is a collection of one or more comments, each of which may contain attachments. Discussions can be attached to sheets or individual rows. You can create discussions, add comments to existing discussions, and list or delete them.

### Sharing

Use sharing operations to control sharing of dashboards, reports, sheets, and workspaces. You can grant access to specific users or groups with varying permission levels.

### Dashboards (Sights)

Create, read, update, and delete dashboards. Report and dashboard contents are read-only through the API.

### Reports

Access report data. Reports aggregate data from multiple sheets. Report contents are read-only via the API.

### Users and Groups

The users API supports user CRUD operations, seat type operations, and activation/deactivation operations. Manage groups and group memberships within your organization.

### Sheet Summary

A sheet summary allows users to define, organize, and report on custom project and business metadata.

### Search

Search a specific sheet or search across all sheets that a user can access.

### Favorites

Smartsheet allows users to "star" dashboards, folders, reports, sheets, workspaces, and other objects to mark them as favorites. The API allows you to access, create, and delete favorites.

### Send via Email

Send sheets, rows, reports, or update requests via email directly through the API.

### Update Requests

Create update requests to ask collaborators to update specific rows in a sheet.

### Templates

List available templates and create sheets from templates.

### Proofs

Manage proofing workflows on attachments for review and approval.

### Event Reporting

Smartsheet uses event objects to capture actions such as creating, updating, loading, deleting, and more for items such as sheets, reports, dashboards, attachments, and users. With Event Reporting, you can programmatically retrieve these events.

- Event Reporting is a premium add-on available for Enterprise and Advanced Work Management plans only.
- Events can be filtered by sheet IDs or workspace IDs and retrieved from a specific point in time.

### Automation Rules

Read automation rules defined on sheets.

### Cross-Sheet References

Create and manage cross-sheet references that allow formulas to reference data in other sheets.

### Contacts

Retrieve the user's personal contacts list.

## Events

Smartsheet supports webhooks for receiving real-time notifications about changes.

### Sheet Webhooks

Sheet webhooks send callbacks that contain sheet-related events. A sheet webhook monitors a single sheet and delivers notifications when changes occur. For sheet scope webhooks, the object affected by the event can be one of several object types including rows, columns, cells, attachments, discussions, and comments (e.g., row added, cell updated, row deleted).

- **Scope:** Set to a specific sheet by providing its ID.
- **Subscope:** You can limit the webhook to specific columns by specifying their IDs in a subscope property.
- **Event filtering:** Sheet webhooks only support sending all sheet events — you must set events to `*.*`. You filter events in your callback handler.
- The callback payload is a "skinny payload" — it indicates the changed objects and event type but does not contain substantial object data. You must call the API to retrieve the full data.
- Sheet webhooks are automatically disabled on sheets that exceed 20,000 rows, 400 columns, or 500,000 cells.

### Plan Webhooks

Plan webhooks send callbacks that contain plan-related events. These monitor account-level events.

- Currently supports user seat type change events (`user.seatType.updated`).
- Only plan webhooks support event filtering, allowing you to subscribe to specific event patterns rather than all events.
- Custom headers can be included in webhook callbacks for plan-level webhooks.

### Webhook Verification

Smartsheet webhooks require an event-handling endpoint that receives notifications. When enabling a webhook, Smartsheet sends a verification challenge that your endpoint must acknowledge. Smartsheet uses a shared secret to sign callback payloads using HMAC-SHA256 for integrity verification. Smartsheet periodically re-verifies that your endpoint is still listening.
