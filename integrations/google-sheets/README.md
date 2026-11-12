# <img src="https://provider-logos.metorial-cdn.com/google-sheets.svg" height="20"> Google Sheets

Create, read, and update spreadsheets and their cell data. Read and write values to individual cells, ranges, or multiple ranges using A1 notation or named ranges. Apply cell formatting including text styles, backgrounds, borders, number formats, and conditional formatting. Manage sheets (tabs) within a spreadsheet—add, delete, copy, rename, and reorder them. Create and manage embedded charts, pivot tables, filter views, data validation rules, protected ranges, named ranges, and merged cells. Perform batch operations to apply multiple updates atomically.

## Events

`row_added` and `row_updated` observe a selected keyed table every 15 minutes.
The first successful read establishes a silent baseline. Select a spreadsheet
ID, stable numeric sheet ID (discover it with **Get Spreadsheet**), bounded A1
range such as `A1:D1000`, and immutable key column such as `A`. The first row of
the range is the header row. Optional watched-column letters limit update
events; by default all columns except the key are watched.

Every row to be observed needs a unique, nonblank text, number, or boolean key.
A row whose key is blank, a formula, or shared with another row is skipped; all
other rows are still observed, and each check reports a warning with the number
of skipped rows and a few row numbers. A skipped row is reported as added once
it has a usable key. A known key that is typed into a second row keeps its last
unambiguous values and, when it is unique again, reports an update only if its
watched values changed. Entirely blank rows are ignored. Sorting or inserting
blank rows changes positions, not identities. Changing a key is treated as a
different record; the integration does not create, repair, or enforce keys in
your spreadsheet.

Comparison preserves entered text, numbers, and booleans. Formulas are returned
as `{ "formula": "=SUM(C2:D2)" }` and compared by expression, separately from
literal text. Formula recalculation, formatting, and calculated spill cells do
not produce changes. Dates retain their underlying numeric serial values.
Blank and empty-string cells are normalized to `null`, including omitted
trailing cells. Changing the selection or the header of the key column
establishes another silent baseline and reports a warning. Columns are
identified by letter, so editing any other header keeps every row observation.
When the header of a watched column changes, value changes in that column alone
are left out of that one check, because a changed header usually means the
column was moved or replaced; this prevents a flood of updates after a column
is inserted or deleted.

Outputs include the spreadsheet/tab identity, immutable key, current row
number, columns, headers, entered values, durable revision, and `observedAt`.
Updates also include previous values and the watched columns that changed.
These are net changes between successful reads: intermediate edits can be
missed, and `observedAt` is not an edit timestamp. Rows outside the selected
range are not monitored; deletions have no event. A key that leaves the range
and later returns is a new addition observation with a new revision. Removed
keys are not remembered, so a table whose keys keep rotating can be observed
indefinitely; `revision` increases with every reported observation of a key and
is never reused for it, but is not necessarily consecutive. The range may extend
past the sheet's last row or column: cells the sheet does not have read as
blank, so a sheet that is shorter than the range, or that shrinks, keeps being
observed.

This feature requires a runtime that persists polling baselines and selection,
serializes concurrent polls, and atomically accepts events with their updated
baseline. There is no stateless fallback. OAuth and service-account access are
supported; API-key authentication is not advertised for these events. See the
[event contract](./docs/SPEC.md#row-observation-events) for limits and recovery.

## Tools

### Batch Update

Executes multiple spreadsheet update operations atomically in a single request. Supports any combination of operations such as formatting, adding/removing sheets, creating charts, merging cells, adding conditional formatting, and more. Operations are applied in order. Use this for complex updates that need to be applied together, or when you need to perform operations not covered by other tools (e.g., conditional formatting rules, merge cells, add charts, pivot tables, filter views).

### Clear Cells

Clears all values from a specified range in a spreadsheet while preserving formatting. Use this to remove cell contents without deleting the cells themselves.

### Create Chart

Creates an embedded chart in a spreadsheet. Supports bar, line, pie, area, scatter, and column chart types. Configure the data source range, chart position, title, and axis labels.

### Create Filter View

Creates a filter view that provides a filtered perspective of data without affecting what other users see. Configure filter criteria per column including value-based and condition-based filters.

### Create Pivot Table

Creates a pivot table that summarizes data from a source range. Configure row and column groupings, value aggregations (sum, count, average, etc.), and filters. The pivot table is placed at a specified cell location.

### Create Spreadsheet

Creates a new Google Sheets spreadsheet with optional initial sheet tabs. Returns the spreadsheet ID and URL for immediate use.

### Delete Spreadsheet

Permanently deletes a spreadsheet from Google Drive. This action cannot be undone. Requires Drive scope.

### Format Cells

Applies formatting to cells in a spreadsheet range. Supports text styling (bold, italic, font, color), cell backgrounds, number formats, text alignment, borders, and text wrapping. Multiple formatting options can be applied in a single call.

### Get Spreadsheet

Retrieves metadata and properties of a Google Sheets spreadsheet, including its title, locale, list of sheets/tabs, and named ranges. Use this to inspect spreadsheet structure before performing operations.

### Manage Named Ranges

Add, update, or delete named ranges in a spreadsheet. Named ranges assign a custom name to a cell range, making it easier to reference in formulas and API calls.

### Manage Protected Ranges

Add or remove protection on cell ranges to prevent modifications. Optionally specify which users can still edit the protected range. Can protect an entire sheet or a specific range within a sheet.

### Manage Sheets

Add, delete, duplicate, rename, or update individual sheet tabs within a spreadsheet. Configure sheet properties like grid size, frozen rows/columns, tab color, and visibility.

### Merge Cells

Merge or unmerge a range of cells in a spreadsheet. Supports merging all cells into one, merging by rows, or merging by columns.

### Read Cells

Reads values from one or more ranges in a spreadsheet. Supports A1 notation (e.g., "Sheet1!A1:B10") and named ranges. Can read a single range or multiple ranges at once. Returns values as formatted strings, raw values, or formulas.

### Set Data Validation

Sets data validation rules on a range of cells. Restrict input to dropdown lists, number ranges, date constraints, checkbox, or custom formulas. Can show warnings or reject invalid input.

### Update Spreadsheet

Updates the properties of a Google Sheets spreadsheet, such as its title, locale, or time zone.

### Write Cells

Writes values to one or more ranges in a spreadsheet. Supports single-range writes, multi-range batch writes, and appending data to the end of a table. Values can be written as raw data or interpreted as user input (parsing dates, formulas, etc.).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
