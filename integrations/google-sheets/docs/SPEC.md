# Slates Specification for Google Sheets

## Overview

Google Sheets is a cloud-based spreadsheet application that is part of the Google Workspace suite. The Google Sheets API is a RESTful interface that lets you read and modify a spreadsheet's data. On Google Sheets API v4, you get access to almost every spreadsheet feature, including charts, pivot tables, and filter views, as well as cell formatting.

## Authentication

Google Sheets API supports two primary authentication methods, both based on OAuth 2.0:

### OAuth 2.0 (User Authentication)

If you'd like to access spreadsheets on behalf of end users (including yourself), use OAuth Client ID. This requires:

1. A Google Cloud project with the Google Sheets API enabled.
2. An OAuth 2.0 Client ID and Client Secret, created in the Google Cloud Console under "APIs & Services > Credentials."
3. An OAuth consent screen configured with desired scopes.

**OAuth Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`

### Service Account

If you plan to access spreadsheets on behalf of a bot account, use Service Account. A service account is a special type of Google account intended to represent a non-human user that needs to authenticate and be authorized to access data in Google APIs. Since it's a separate account, by default it does not have access to any spreadsheet until you share it with this account.

This requires a service account JSON key file created in the Google Cloud Console.

### API Key (Read-Only, Public Data)

If you'd like to only open public spreadsheets, use API key. API keys can only be used to read publicly shared spreadsheets and do not provide access to private data.

### Scopes

Sheets API scopes are applied to a spreadsheet file and cannot be limited to a specific sheet. The relevant scopes are:

- `https://www.googleapis.com/auth/spreadsheets` — Full read/write access to all spreadsheets.
- `https://www.googleapis.com/auth/spreadsheets.readonly` — Read-only access to all spreadsheets.
- `https://www.googleapis.com/auth/drive` — Full access to Google Drive (includes Sheets); needed for file-level operations like creating or deleting spreadsheets.
- `https://www.googleapis.com/auth/drive.readonly` — Read-only access to Drive files.
- `https://www.googleapis.com/auth/drive.file` — Access only to files created or opened by the app.

## Features

### Spreadsheet Management

Create new spreadsheets, retrieve spreadsheet metadata (title, locale, sheets list), and update spreadsheet properties. A spreadsheet can contain multiple sheets, each with structured information contained in cells. Each spreadsheet is identified by a unique spreadsheet ID derivable from its URL.

### Reading Cell Data

Read values from individual cells, ranges, or multiple ranges at once. Data can be retrieved from specific sheets using A1 notation (e.g., `Sheet1!A1:B10`) or named ranges. Values can be returned as formatted strings or raw/unformatted values.

### Writing Cell Data

Write values to specific cells or ranges. Supports single-range updates and multi-range batch updates. Values can be written as raw input or parsed as if the user typed them into the UI (interpreting dates, formulas, etc.). Data can also be appended to the end of a table.

### Cell Formatting

Apply formatting to cells including text styles (bold, italic, font size, color), cell backgrounds, number formats, borders, text alignment, and conditional formatting rules. You get complete access to cell formatting, such as setting colors, text styles, and even conditional formatting.

### Sheet Management

Add, delete, copy, and rename individual sheets (tabs) within a spreadsheet. Configure sheet properties such as grid size, frozen rows/columns, and tab color. Reorder sheets within a spreadsheet.

### Protected Ranges

Define cells or ranges of cells that cannot be modified. A ProtectedRange resource represents a protected range. Manage editor permissions on protected ranges to control who can edit specific areas.

### Named Ranges

Define cells or ranges of cells with a custom name to simplify references throughout an application.

### Charts

Create and manage embedded charts within spreadsheets. Supports various chart types (bar, line, pie, area, scatter, etc.) with configurable data sources, axes, legends, and styling options.

### Pivot Tables

The Google Sheets API can create and update pivot tables through code. Pivot tables summarize large datasets without changing the original data, which helps with reporting and analysis. Configure row/column groupings, value aggregations (sum, count, average, etc.), and filters.

- Updating a pivot table requires supplying the entire pivot table definition (it is replaced, not patched).

### Filter Views

Create and manage filter views that allow different filtered perspectives of data without affecting what other users see. Configure filter criteria per column including value-based and condition-based filters.

### Data Validation

Set validation rules on cells to restrict input (e.g., dropdown lists, number ranges, date constraints, custom formulas). Configure whether to show warnings or reject invalid input.

### Merging Cells

Merge and unmerge ranges of cells. Supports different merge strategies (merge all, merge columns, merge rows).

### Batch Operations

Perform multiple distinct update operations (formatting, adding sheets, creating charts, etc.) in a single request using `batchUpdate`. This allows complex spreadsheet modifications to be applied atomically.

## Events

The Google Sheets API itself does not provide native webhook or push notification support. However, file-level change notifications can be achieved through the **Google Drive API's push notifications** mechanism.

### File Change Notifications (via Google Drive API)

To request push notifications, you must set up a notification channel for each resource you want to monitor. After your notification channels are set up, the Google Drive API informs your application when any watched resource changes.

- You register a webhook URL using the Drive API's `files.watch` method on a specific spreadsheet's file ID.
- When a watched resource changes, your application receives a notification message as an HTTPS POST request to the specified URL. The notification includes headers with details about the change, such as: `X-Goog-Resource-State` (e.g., add, remove, update) and `X-Goog-Changed` (e.g., content, parents, children, permissions).
- For the Google Drive API, the maximum expiration time is 86400 seconds (1 day) for the files resource and 604800 seconds (1 week) for changes. Channels must be renewed before expiration.
- These methods don't provide information regarding the actual change that was made. While it does include the fileId in the change item, it also doesn't specify who made the change or at what time it was made. You must call the Sheets API separately to fetch the updated data.
- The webhook receiver URL must be HTTPS and the domain must be verified in the Google Cloud Console.
- Requires Drive API scopes (e.g., `https://www.googleapis.com/auth/drive` or `https://www.googleapis.com/auth/drive.readonly`).

### Drive-Wide Change Notifications (via Google Drive API)

Subscribes to changes for a user. Using the `changes.watch` method, you can monitor all changes across a user's Drive (including spreadsheets). This provides broader coverage but requires filtering to identify relevant spreadsheet changes. Same expiration and domain verification constraints apply as above.
