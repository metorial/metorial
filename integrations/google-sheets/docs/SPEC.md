# Google Sheets Specification

## Overview

Google Sheets is a cloud-based spreadsheet application that is part of the Google Workspace suite. The Google Sheets API is a RESTful interface that lets you read and modify a spreadsheet's data. On Google Sheets API v4, you get access to almost every spreadsheet feature, including charts, pivot tables, and filter views, as well as cell formatting.

## New row events

The `new_rows` polling group emits `new_row` (`row.new`) every 900 seconds for
rows added below the last filled row of one tab. Selection is a
`spreadsheetId` (a bare ID or a Google Sheets link; a `gid` in the link selects
the tab) and an optional numeric `sheetId`; without one the first tab is used
and then kept even if tabs are reordered. The first successful count is silent.

Saved state (`schemaVersion` 2) holds no sheet contents: `spreadsheetId`, the
resolved `sheetId`, `tabChosen`, `epoch`, `rowCount` (the grid's
`gridProperties.rowCount` at the last poll), `rowsSeen` (the last row reported
or counted), `scannedTo` (how far below `rowsSeen` the rows were found empty)
and, while a count is unfinished, `countFrom`. A state that does not parse,
including the `schemaVersion` 1 state of earlier builds, starts a new silent
count with `epoch` 1. `epoch` otherwise carries over from the saved state, also
when the spreadsheet or tab changes, so returning to a tab never repeats an event
ID.

Rows are read with
[`spreadsheets.values.batchGet`](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet),
at most 2,000 rows per range and at most five reads per poll after the tab
list; a response over 64 MiB is refused while it is read and fails the poll with
a readable error. The API exposes no row counter, so a count reads upwards from
a starting row until it finds a filled row; when five reads do not reach one,
`countFrom` saves where the next poll continues. The first count starts at the
grid's last row, so a full tab takes one read, and a tab whose last filled row is
more than 10,000 rows above the grid's last row takes more than one poll.

Every later poll reads the header row and the 2,000 rows starting on `rowsSeen`,
and reports filled rows below `rowsSeen`, at most 500 per poll; further rows wait
for the next poll. When those rows are all empty, up to four more reads of 2,000
rows continue from `scannedTo` and the first filled rows found there are
reported; after reaching the grid's last row the search starts again below the
first read. A row that far below therefore arrives within one poll per 8,000
rows of distance, more when rows directly below `rowsSeen` keep arriving, since a
poll that finds those does not search further. The last reported row becomes the
bottom: rows filled later above it, in an empty stretch that was skipped or
anywhere else, are never reported.

Rows were removed when the grid has fewer rows than `rowCount`, or when row
`rowsSeen` is now empty. `epoch` then increases and a new count starts at row
`rowsSeen` (or the grid's last row if that is lower); that poll reports nothing.
Rows below the old `rowsSeen` are reported from the next poll. A row added
between the same two polls at or above the old `rowsSeen` is missed: after one
row is deleted and one appended, the appended row takes the last reported row
number. Rows inserted above `rowsSeen` without a deletion shift the rows below
them, and those that move below `rowsSeen` are reported again with new event
IDs. Rows added while a count is unfinished can be counted as already present.

Values are unformatted (numbers and booleans keep their type, formulas report
their result) with dates as shown in the sheet. Each event has `eventId`,
`spreadsheetId`, `sheetId`, `sheetTitle`, `rowNumber`, `headers`, `values`,
`row` (values by header text; blank headers are left out and the leftmost of
duplicate headers wins), and `observedAt`. `eventId` is derived from the
spreadsheet, tab, `epoch`, and row number.

The spreadsheet and tab can be picked from lists. Tabs come from the Sheets
API. Spreadsheets come from Google Drive `files.list`: the `spreadsheetId` field
is linked to the `files` option list of `google/google-drive` with `mimeType`
`application/vnd.google-apps.spreadsheet`, which lists every spreadsheet the
account can see when a Google Drive connection of the same account exists.
Otherwise the field's own list runs on this connection with the same
`files.list` query (`corpora=allDrives`, so My Drive, files shared with the
account and the shared drives it is a member of; most recently modified first,
50 per page, searched by name). It needs a Drive scope, and with `drive.file`
returns only the spreadsheets created or opened with this app. Both fields can also be entered directly: a spreadsheet ID or link for
`spreadsheetId`, and the `sheetId` from **Get Spreadsheet**.

OAuth and service-account triggers use existing spreadsheet read permissions.
API-key triggers are not advertised.

## Authentication methods

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

The restricted broad Drive scopes (`drive`, `drive.readonly`) are not requested by this integration. Connections that granted them previously keep working; new connections use `drive.file`, so Drive-level operations such as deleting spreadsheets apply only to files created or opened through this connection.

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
