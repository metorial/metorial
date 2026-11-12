# Google Sheets Specification

## Overview

Google Sheets is a cloud-based spreadsheet application that is part of the Google Workspace suite. The Google Sheets API is a RESTful interface that lets you read and modify a spreadsheet's data. On Google Sheets API v4, you get access to almost every spreadsheet feature, including charts, pivot tables, and filter views, as well as cell formatting.

## Row observation events

The `row_observations` polling group emits `row_added` (`row.added`) and
`row_updated` (`row.updated`) every 900 seconds. These are observations of net
changes in a selected table, not a native edit log or exact insert/update
timestamps. Existing rows are silent on initial activation. Two
[`spreadsheets.get`](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get)
requests resolve the current title by immutable `sheetId`, then read the full
selected range with only grid properties and entered cell values. These reads
support `spreadsheets.readonly`. The returned grid must still match the selected
spreadsheet and sheet IDs: a rename or title reassignment between requests can
fail the poll, but cannot substitute a different tab into the baseline. Renaming
a tab does not change record identity. There are no writes during observation.

### Selection and discovery

Use existing spreadsheet results/URLs for `spreadsheetId`, **Get Spreadsheet**
to discover `sheetId`, and **Read Cells** to inspect the table before selecting:

```json
{
  "spreadsheetId": "spreadsheet-id-from-url",
  "sheetId": 0,
  "range": "A1:D1000",
  "keyColumn": "A",
  "watchedColumns": ["B", "C", "D"]
}
```

All selection fields except `watchedColumns` are required. Columns are absolute
uppercase letters. `range` is one bounded rectangle without a sheet prefix or
named-range alias; its first row is the header. The key-column header must be
nonblank text. Omitting `watchedColumns` watches every selected column except
the key; explicitly watching the key or a column outside the rectangle is an
error. Column order/duplicates in the watched selection are canonicalized.

Every row to be observed needs a unique immutable primitive key. Text `"1"`,
number `1`, and boolean `true` are distinct identities. Entirely blank rows are
ignored. A row is skipped when its key is blank or whitespace-only, when its key
is a formula, or when another row in the range has the same key; in the last
case every row carrying that key is skipped, because none of them identifies
the record. Skipped rows never fail the poll: all other rows are observed, and
one warning per poll gives the number of skipped rows for each reason with up to
five row numbers each.

Skipped rows follow these transitions. A row that never had a usable key is
reported as `row.added` once its key becomes usable. A tracked key that becomes
shared with another row is still in the table, so its last unambiguous snapshot
is kept unchanged for as long as the key is shared; when exactly one row carries
it again, that row is compared with the kept snapshot and reported as
`row.updated` only if a watched value differs. A tracked row whose key is
cleared or replaced by a formula can no longer be identified, which is the same
as the key leaving the table: nothing is reported while the key is unusable, and
one `row.added` is reported if the key is restored.

Keys are a table-owner contract: changing one produces another identity and
cannot be distinguished from replacing a record. Sorting and row insertion do
not themselves add records; moving a row outside the rectangle removes it from
the monitored snapshot.

Columns are identified by letter, not by header text. Changes to the range, the
key column, the watched columns, or the header of the key column silently
rebaseline, increment the generation, and emit an explicit warning; a changed
key header is treated this way because it usually means a different column now
sits under that letter, which would make every key look new. No other header
edit rebaselines. A header edit in a column that is not watched has no effect on
observations. When the header of a watched column changes (a rename, a blank
header being filled in, or a column shifting under that letter), value
differences in that column are not reported for that one poll and a warning
names the column; differences in the other watched columns and added rows are
reported as usual, and the column is compared normally from the next poll on.
An inserted, deleted, or reordered column therefore does not create mass
updates, and a pure rename of a watched header hides at most one poll of edits
to that one column.

### Comparison and payload

[`userEnteredValue`](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/cells#CellData)
and its
[`ExtendedValue`](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue)
type distinguish strings, numbers, booleans, and formula expressions. Output
`values` and `previousValues` align with the absolute `columns` array. A formula
is an object such as `{ "formula": "=C2*2" }`; a literal string beginning with
`=` remains a string. Missing values and empty strings normalize to `null`, and
omitted trailing cells are padded to the selected width. Text whitespace is
otherwise preserved. Dates are numeric serial values. Formula-expression
changes count, including reference adjustments made by a sort or insert;
calculated-result changes, formula spill output, cell formatting, and comments
do not count. This compares entered cells rather than rendered values.

Both events include `observationId`, `spreadsheetId`, `sheetId`, `sheetTitle`,
`range`, `keyColumn`, typed `key`, current one-based `rowNumber`, `columns`,
`headers`, `values`, per-key `revision`, and `observedAt`. Updates also include
the last successful snapshot's `previousValues` and `changedColumns` (watched
columns only). An unwatched edit quietly refreshes the stored full row. There
is no deletion event, and removed keys are not remembered: only the highest
revision reached by any removed key is kept. A key that is new, or that returns
after leaving the table, is reported as an addition whose revision is above that
number, so it cannot repeat an earlier `observationId` of the same key however
long ago the key was removed. `revision` therefore increases with every reported
observation of a key and is never reused for it, but is not guaranteed to be
consecutive or to start at 1. Observed A→B→A changes have different IDs; A→B→A
entirely between polls is invisible.

### Bounds, failures, and runtime prerequisite

Selections are limited to 10,000 rows (including headers) and 100,000 cells.
The range may extend beyond the sheet's current grid: rows and columns the sheet
does not have read as blank. A sheet with fewer rows than the range, or one that
shrinks when rows are deleted, therefore keeps being observed, and keys in rows
that no longer exist are treated as removed. The header row and the key column
must exist. A poll reads the full selected range; there is no slicing, paging
cap, or partial-result success. Invalid response types, mismatched
sheet/spreadsheet identity, unexpected grid offsets, and oversized responses
fail the poll; a range response larger than 64 MiB is refused while it is being
read. Normal trailing empty `GridData` omissions are interpreted as
blanks, as required for sparse Sheets responses. The baseline holds only the
keys currently in the range (at most 9,999) and is limited to 8 MiB of entered
values; exceeding that fails before progress is returned, and selecting a
smaller range resolves it. Provider errors also preserve the previous baseline,
including permission loss.

Deployment must provide persisted subscription selection and durable polling
state, with per-instance lease or compare-and-swap concurrency control and
atomic acceptance of emitted events plus `updatedState`. Restarting with the
committed state resumes without replaying unchanged rows. Retrying the same
transition preserves its event identity. Concurrent stale results must never
overwrite a newer baseline. A runtime that sends null state on every poll is
unsupported and cannot deliver these events; there is no stateless fallback.
The initial null state and an explicit reset establish a new silent baseline.
Corrupt or incompatible saved state fails visibly rather than auto-resetting.

OAuth and service-account triggers use existing spreadsheet read permissions.
API-key triggers are not advertised. No Apps Script, row mutation, or Drive
notification is used as a replacement for the durable comparison contract.

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

## Events

This integration does not currently expose event triggers.
