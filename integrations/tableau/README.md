# <img src="https://provider-logos.metorial-cdn.com/tableau.png" height="20"> Tableau

Manage Tableau Cloud and Tableau Server resources programmatically through the Tableau REST API. Query and manage workbooks, data sources, views, custom views, flows, users, groups, projects, permissions, favorites, collections, jobs, and data-driven alerts. Export views as CSV, PNG, or PDF. Authentication supports Tableau personal access tokens, username/password sign-in, and connected-app or unified-access-token JWT sign-in.

## Tools

### Get Site Info

Retrieve information about the current Tableau site, including name, URL, storage usage, and configuration settings.

### Get View Data

Export the underlying data from a Tableau view as CSV. Useful for retrieving the tabular data behind a dashboard visualization.

### Export View

Export a Tableau view as CSV data, a PNG image, or a PDF file. Supports Tableau view filter query parameters and cache max-age controls.

### List Data Sources

List and search data sources on the Tableau site. Supports pagination, filtering, and sorting.

### List Views

List and search views across the Tableau site. Supports pagination, filtering, and sorting.

### List Workbooks

List and search workbooks on the Tableau site. Supports pagination, filtering, and sorting to find specific workbooks.

### Manage Data-Driven Alerts

List, get, delete data-driven alerts, and add or remove users from alert recipient lists. Data-driven alerts trigger when data in a view meets specified conditions.

### Manage Collections

List, get, create, update, or delete collections, and add, remove, or list collection items. Collections are curated groups of Tableau content.

### Manage Custom Views

List, get, update, delete, or export Tableau custom views. Custom views are saved user-specific configurations of workbook views.

### Manage Data Source

Get details, update, delete, or trigger extract refresh for a data source. Use the **action** field to select the operation.

### Manage Favorites

List, add, or remove favorites for a user. Supports workbooks, views, data sources, projects, and flows.

### Manage Flows

List, get, update, delete, or run Tableau Prep flows. Use the **action** field to select the operation.

### Manage Groups

List, create, update, delete groups, and add or remove users from groups. Use the **action** field to select the operation.

### Manage Jobs

List, get details, or cancel background jobs (extract refreshes, flow runs, subscriptions). Use the **action** field to select the operation.

### Manage Permissions

Query, add, or delete permissions on Tableau resources (workbooks, datasources, projects, views, flows). Permissions are granted to users or groups with specific capability modes.

### Manage Projects

List, create, update, or delete projects. Projects organize workbooks, data sources, and other content in Tableau.

### Manage Users

List, get, add, update, or remove users on the Tableau site. Use the **action** field to select the operation.

### Manage Workbook

Get details, update properties, delete, refresh extracts, or manage tags for a workbook. Use the **action** field to select the operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
