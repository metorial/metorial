# <img src="https://provider-logos.metorial-cdn.com/mode.png" height="20"> Mode

Manage collaborative analytics reports, SQL queries, and dashboards. Create, update, archive, and delete reports within collections. Execute report runs and retrieve query results, with export to CSV or PDF. Schedule recurring report executions and manage subscriptions for report distribution. Manage datasets, data source connections, and metric definitions. Organize reports into collections (spaces). Access and manage Python/R notebooks within reports. Manage workspace members and roles. Receive webhook notifications for report, run, data source, definition, and membership events.

## Tools

### Get Report

Retrieve detailed information about a specific Mode report by its token. Returns the report's name, description, archived status, timestamps, and associated collection.

### List Data Sources

List all database connections (data sources) configured in the workspace. Returns each data source's name, adapter type, host, database, and port.

### List Members

List all members of the Mode workspace. Returns each member's username, email, name, admin status, and membership state.

### List Reports

List reports within a Mode workspace. You can filter reports by collection or data source. Supports ordering and filtering by creation or update timestamps.

### List Collections

List all collections (formerly Spaces) in the workspace. Optionally filter to include all collections (including ones the admin has not joined) or only custom collections.

### List Datasets

List datasets in the workspace. Filter by collection or data source. Supports ordering by creation or update timestamps.

### List Definitions

List metric definitions in the workspace. Definitions provide a shared vocabulary for key metrics across the organization. Optionally filter by tokens.

### Manage Query

Create, update, list, or delete SQL queries within a Mode report. Use **create** to add a new SQL query to a report. Use **update** to modify an existing query's SQL, name, or data source. Use **list** to get all queries in a report. Use **delete** to remove a query from a report.

### Manage Report

Update, archive, unarchive, or delete a Mode report. Use **update** to change the report's name, description, or move it to a different collection. Use **archive** or **unarchive** to soft-delete/restore a report. Use **delete** to permanently remove a report.

### List Report Schedules

List all scheduled runs configured for a specific Mode report. Returns schedule details including frequency, time, and timezone.

### Run Report

Trigger a new execution (run) of a Mode report. Optionally pass parameters to customize the run. Returns the run's token and initial state so you can track its progress.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
