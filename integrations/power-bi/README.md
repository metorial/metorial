# <img src="https://provider-logos.metorial-cdn.com/power-bi.png" height="20"> Power Bi

Manage Power BI workspaces, datasets, reports, dashboards, and dataflows. Create and refresh datasets, trigger data refreshes, execute DAX queries, and push real-time data into tables. Import PBIX and Excel files into workspaces. Generate embed tokens for embedding reports and dashboards in custom applications. Clone, rebind, and export reports to PDF, PPTX, or PNG. Manage workspace membership and user roles. Administer deployment pipelines to promote content across development, test, and production stages. Perform tenant-wide admin operations including scanning workspaces, listing all content, and managing capacities. Manage on-premises data gateways and their data sources. Retrieve published apps and template apps.

## Tools

### Assign Workspace to Capacity

Assign or unassign a Power BI workspace to/from a Premium or Embedded capacity. Assigning enables premium features like paginated reports and larger datasets.

### Execute DAX Query

Execute a DAX (Data Analysis Expressions) query against a Power BI dataset and return the results. Only DAX queries are supported.

### Export Report

Export a Power BI report to a file format (PDF, PPTX, PNG) or check the status of an ongoing export. The export runs asynchronously — first trigger the export, then poll the status.

### Generate Embed Token

Generate an embed token for embedding Power BI reports or dashboards in custom applications. Supports both report-level and dashboard-level embed tokens.

### Get Dataset Details

Get detailed information about a Power BI dataset including its properties, data sources, parameters, tables, and refresh schedule.

### List Apps

List published Power BI apps accessible to the authenticated user. Apps are read-only collections of dashboards and reports shared with an audience.

### List Capacities

List available Power BI Premium and Embedded capacities. View capacity names, SKUs, states, regions, and admin assignments.

### List Dashboards

List Power BI dashboards and optionally include tile details. Retrieve dashboard names, IDs, embed URLs, and the tiles they contain.

### List Dataflows

List all Power BI dataflows in a workspace. Returns dataflow names, IDs, and configuration details.

### List Datasets

List all Power BI datasets. Optionally filter by workspace. Returns dataset names, IDs, configuration details, and refresh capabilities.

### List Gateways

List on-premises data gateways and optionally include their data sources. View gateway configurations and connected data sources.

### List Reports

List all Power BI reports. Optionally filter by workspace. Returns report names, IDs, dataset bindings, and URLs.

### List Workspaces

List all Power BI workspaces (groups) accessible to the authenticated user. Returns workspace names, IDs, capacity assignments, and read-only status.

### Manage Deployment Pipeline

List deployment pipelines, view pipeline stages and artifacts, deploy content between stages, or check deployment operation status.

### Manage Report

Get report details, list pages, clone a report, rebind to a different dataset, or delete a report.

### Manage Workspace Users

List, add, update, or remove users from a Power BI workspace. Manage workspace membership and roles (Admin, Member, Contributor, Viewer).

### Manage Workspace

Create or delete a Power BI workspace. Use **create** to provision a new workspace or **delete** to remove an existing one.

### Push Data to Table

Push rows of data into a Power BI push dataset table or delete all rows from a table. Useful for real-time and streaming dashboard scenarios.

### Refresh Dataflow

Trigger a refresh for a Power BI dataflow. The refresh runs asynchronously to update data preparation logic.

### Refresh Dataset

Trigger a dataset refresh or view refresh history. Use this to keep datasets up-to-date with the latest source data and monitor refresh status.

### Update Dataset Parameters

Update parameter values on a Power BI dataset. Useful for changing connection strings, server names, database names, or other configurable parameters without modifying the dataset definition.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
