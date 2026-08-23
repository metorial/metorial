# <img src="https://provider-logos.metorial-cdn.com/metabase.png" height="20"> Metabase

Run and export saved questions, execute SQL or MBQL queries, inspect database and table metadata, and manage questions, dashboards, collections, users, groups, permissions, public links, and scheduled question alerts.

## Tools

### Execute Query

Execute an ad-hoc query or run a saved question's query against a connected database. Supports native SQL queries and Metabase's structured query language (MBQL). Returns query results including column metadata and row data.

### Export Question Results

Run a saved question and return its complete CSV, JSON, or XLSX result as a downloadable file.

### Get Current User

Return the Metabase user represented by the current connection.

### Get Table Metadata

Inspect a table and its fields before building an MBQL query or understanding available data.

### List Dashboards

List dashboards in Metabase with optional filtering. Returns all dashboards, dashboards you created, or archived dashboards.

### List Questions

List saved questions (cards) in Metabase with optional filtering. Returns all questions, your questions, bookmarked or archived questions, or questions filtered by a related object.

### Manage Alert

Create, update, retrieve, list, or archive scheduled alerts for saved questions. Alerts use Metabase notification handlers for email, Slack, or HTTP delivery and Quartz cron schedules.

### Manage Collection

Create, update, retrieve, list, or archive collections in Metabase. Collections organize questions, dashboards, and other content. Use "root" for top-level content and "trash" for archived content.

### Manage Dashboard Cards

Add or remove question cards from a dashboard. When adding a card, you can specify its position and size on the dashboard grid. Parameter mappings allow you to connect dashboard filters to the card's parameters.

### Manage Dashboard

Create, update, retrieve, copy, or archive a dashboard in Metabase. Dashboards organize questions (cards) into a visual layout. Use this to manage dashboard properties like name, description, collection, and parameters. Set **archived** to true to move a dashboard to the trash.

### Manage Database

List connected databases, retrieve database details and table metadata, or trigger a sync/rescan. Use Get Table Metadata to inspect fields for one table.

### Manage Permissions

Manage permission groups, group memberships, and the versioned data permissions graph in Metabase.

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
