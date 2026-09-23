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
- `https://www.googleapis.com/auth/drive.file` — Access only to files created or opened by the app.

The restricted broad Drive scopes (`drive`, `drive.readonly`) are not requested by this integration. Connections that granted them previously keep working; new connections use `drive.file`, so Drive-level operations (deleting spreadsheets, change-notification watches) apply only to files created or opened through this connection.

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

Add, delete, duplicate, and rename individual sheets (tabs) within a spreadsheet. Configure sheet properties such as grid size, frozen rows/columns, and tab color. Reorder sheets within a spreadsheet. The `manage_sheets` tool's `copy_to_spreadsheet` action copies one sheet into another spreadsheet by source spreadsheet ID, numeric source sheet ID, and destination spreadsheet ID. Google returns the newly created sheet's properties. This action accepts the `spreadsheets`, `drive`, or `drive.file` OAuth scope.

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

**Spreadsheet Changed** (`spreadsheet_changed`) checks the Drive `files.list` endpoint every 15 minutes for Google Sheets files whose `modifiedTime` is in the previous 20 minutes. Enable the event on a connection with Google Drive access. The event type is `spreadsheet.update`, and the event ID is the spreadsheet ID plus the Drive modification time. The output keeps the spreadsheet ID, URL, title, modification time, optional last modifying user, and sheet tab titles. For example, a file modified at 10:00 may produce `{ "spreadsheetId": "abc123", "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/abc123", "title": "Budget", "modifiedTime": "2026-09-23T10:00:00.000Z", "sheetTitles": ["Sheet1"] }`.

This is a current-file check, so several edits between checks can produce one event, and deleted files cannot be found. It does not provide notification channel IDs or changed-field details. Files already modified within the lookback window may produce an event on the first check. `drive.file` access is limited to files created or opened with the connected app; broader existing Drive grants can see more. Google documents the [`files.list` query and paging contract](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [`modifiedTime` metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files), and [file search syntax](https://developers.google.com/workspace/drive/api/guides/search-files).
