# <img src="https://provider-logos.metorial-cdn.com/metabase.png" height="20"> Metabase

Create, manage, and execute queries against connected databases. Build and organize questions (saved queries) using SQL or MBQL, and export results in JSON, CSV, or XLSX formats. Create, update, and share dashboards with configurable parameters and filters. Organize items into collections, manage database connections and metadata, and control user permissions and group access. Set up scheduled alerts on question results with delivery to email, Slack, or webhooks. Search across all Metabase objects, upload CSV data, configure instance settings, and manage embedding with public links or signed tokens.

## Tools

### Execute Query

Execute an ad-hoc query or run a saved question's query against a connected database. Supports native SQL queries and Metabase's structured query language (MBQL). Returns query results including column metadata and row data.

### List Dashboards

List dashboards in Metabase with optional filtering. Returns all dashboards, your dashboards, favorites, or archived dashboards.

### List Questions

List saved questions (cards) in Metabase with optional filtering. Returns all questions, your questions, favorites, archived questions, or questions filtered by database/table.

### Manage Alert

Create, update, retrieve, list, or delete alerts on questions in Metabase. Alerts trigger when specific conditions are met on a question's results — such as when results exist, a time series crosses a goal line, or a progress bar reaches a goal. Alerts can be delivered via email, Slack, or webhook.

### Manage Collection

Create, update, retrieve, or archive a collection in Metabase. Collections organize questions, dashboards, and other items (similar to folders). Use "root" as the collectionId to access the root collection.

### Manage Dashboard Cards

Add or remove question cards from a dashboard. When adding a card, you can specify its position and size on the dashboard grid. Parameter mappings allow you to connect dashboard filters to the card's parameters.

### Manage Dashboard

Create, update, retrieve, copy, or archive a dashboard in Metabase. Dashboards organize questions (cards) into a visual layout. Use this to manage dashboard properties like name, description, collection, and parameters. Set **archived** to true to move a dashboard to the trash.

### Manage Database

List connected databases, retrieve database details and metadata, or trigger a sync/rescan. Use the **metadata** action to get all tables, fields, and field values for a database. Use **sync** to trigger a manual schema metadata sync, or **rescan** to trigger a field value scan.

### Manage Permissions

Manage permission groups and group memberships in Metabase. Create or delete permission groups, add or remove users from groups, and list all groups. Permission groups control access to databases, tables, and collections.

### Manage Public Link

Generate or revoke public sharing links for questions and dashboards in Metabase. Public links allow anyone with the URL to view the question or dashboard without authentication.

### Manage Question

Create, update, retrieve, or archive a saved question (card) in Metabase. Questions can be built using native SQL or Metabase's structured query language (MBQL). Use this to manage saved questions including changing their name, description, display type, collection, or query definition. Set **archived** to true to move a question to the trash.

### Manage User

Create, update, retrieve, deactivate, or reactivate a user in Metabase. Supports setting the user's name, email, group memberships, and superuser status. Use **deactivate** to disable a user account or **reactivate** to restore it.

### Search

Search across all Metabase objects — questions, dashboards, collections, databases, and tables. Optionally filter by object type, collection, or database. Returns matching items with their type and location.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
