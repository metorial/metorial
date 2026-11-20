# <img src="https://provider-logos.metorial-cdn.com/google-sheets.svg" height="20"> Google Sheets

Create, read, and update spreadsheets and their cell data. Read and write values to individual cells, ranges, or multiple ranges using A1 notation or named ranges. Apply cell formatting including text styles, backgrounds, borders, number formats, and conditional formatting. Manage sheets (tabs) within a spreadsheet—add, delete, copy, rename, and reorder them. Create and manage embedded charts, pivot tables, filter views, data validation rules, protected ranges, named ranges, and merged cells. Perform batch operations to apply multiple updates atomically.

## New row trigger (parked)

**Switched off.** This integration does not offer event triggers at the moment: spreadsheet activity is observed through the Google Drive integration's file events instead. This section describes the parked new row trigger and is kept for when it is switched back on.

`new_row` fires when a row is added below the last filled row of a tab, checked
every 15 minutes. Choose a spreadsheet (from the list, or paste its link or ID)
and optionally a tab; without one the first tab is used. Rows already in the tab
when the trigger is turned on are not reported. Each event carries the row
number, the header row, the row's values, and the values by header text.

Only counters are saved between checks (the tab ID, its number of rows and row
numbers), never sheet contents, so the trigger cannot tell which rows changed:

- When the tab has fewer rows than at the last check, or the last reported row
  is now empty, rows were removed. The trigger counts again from the last filled
  row and reports nothing for that check. A row added within the same 15
  minutes is reported only if it lands below the row number of the last
  reported row: after one row is deleted, the next row added takes that number
  and is missed.
- A row typed into an empty row above the last reported row is not reported.
  Rows inserted in the middle push the rows below them down, and those of them
  that move past the last reported row are reported again.
- A value far below the data, such as a total, becomes the new last row: it is
  reported, and rows added above it are not.
- A tab is read 2,000 rows at a time, at most five times per check. Counting a
  tab of more than 10,000 rows takes several checks, and rows added before the
  count finishes can be counted as already there. A row more than 2,000 rows
  below the last reported row is searched for 8,000 rows further on each check
  that finds nothing nearer, so it can arrive several checks later.

OAuth and service-account access are supported; API-key authentication is not
advertised for this event.

When a Google Drive connection of the same Google account is set up, the
spreadsheet list shows every spreadsheet that account can see. Otherwise the
list comes from this connection, which with the app-files Drive permission
holds only spreadsheets created or opened with this app; any other spreadsheet
can still be entered by link or ID.

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
