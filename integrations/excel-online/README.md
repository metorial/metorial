# <img src="https://provider-logos.metorial-cdn.com/Excel.png" height="20"> Excel Online

Read and write Excel workbook data stored in OneDrive for Business and SharePoint. Manage worksheets, cell ranges, tables, charts, and named items. Read and write cell values, formulas, and number formats across arbitrary ranges. Create and manage structured tables with sorting and filtering. Generate and retrieve chart images. Invoke Excel's built-in calculation functions (e.g., SUM, VLOOKUP, PMT) remotely without modifying cells. Use persistent or non-persistent sessions for efficient multi-step operations. Subscribe to file-level change notifications for Excel workbooks.

## Tools

### Find Workbooks

Search for Excel workbook files (.xlsx) in OneDrive for Business or SharePoint by keyword, or list workbooks in a specific folder. Returns file metadata including the item ID needed for other Excel operations.

### Invoke Excel Function

Execute an Excel built-in calculation function remotely (e.g., SUM, VLOOKUP, PMT, ABS, IF). Pass parameters and receive the calculated result without writing values into cells. This uses Excel's full calculation engine as a service.

### Manage Charts

Create, list, update, delete charts, or retrieve a chart image from an Excel worksheet. Charts are created from data ranges and support various chart types.

### Manage Named Items

List, get, or create named ranges and constants in an Excel workbook. Named items allow referencing specific ranges or values by friendly names. You can also retrieve the range data associated with a named item.

### Manage Workbook Sessions

Create, refresh, or close workbook sessions for efficient multi-step interactions with an Excel workbook. Persistent sessions save changes to the file; non-persistent sessions discard changes on close, useful for read-only analysis or calculations.

### Manage Table Columns

List, add, or delete columns in a structured Excel table. View the current column structure, add new columns with optional initial values, or remove columns.

### Manage Table Rows

Add or delete rows in a structured Excel table. Add one or more rows at a specific position or at the end of the table, or delete a row by its index.

### Manage Tables

Create, list, update, delete, or convert structured tables in an Excel workbook. Tables provide automatic filtering, sorting, and structured references. You can also retrieve table data, header ranges, and manage table properties.

### Manage Worksheets

List, create, update, or delete worksheets in an Excel workbook. Use this to manage the sheet structure of a workbook — rename sheets, reorder them, change visibility, add new ones, or remove existing ones.

### Read Range

Read cell values, formulas, and number formats from a specific range or the used range of a worksheet. Returns the cell data as a 2D array along with range metadata like address and dimensions.

### Sort & Filter Table

Apply sorting or filtering to a structured Excel table. Sort by one or more columns, apply filter criteria to a specific column, or clear existing sorts and filters.

### Write Range

Write values, formulas, or number formats to a specific cell range in a worksheet. Can also clear or sort a range. The dimensions of the provided arrays must match the target range dimensions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
