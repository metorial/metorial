# <img src="https://provider-logos.metorial-cdn.com/airbyte.png" height="20"> Airbyte

Manage data integration pipelines that sync data from sources (APIs, databases, files) to destinations (data warehouses, lakes, databases). Create, update, and delete source and destination connectors. Configure connections linking sources to destinations with stream selection, sync modes, and schedules. Trigger sync jobs, monitor job status, and cancel running jobs. Manage workspaces, user permissions, and role-based access control. Retrieve stream properties and schemas for sources. Organize resources with tags. Set up embedded connection and source templates for third-party integrations. Receive webhook notifications for sync success, sync failure, schema changes, and sync disabled events.

## Tools

### Cancel Job

Cancel a running Airbyte sync or reset job. Returns the updated job status after cancellation.

### Create Connection

Create a new connection linking a source to a destination in Airbyte. Define which streams to sync, the sync mode, and the sync schedule. Defaults to manual schedule with full_refresh_overwrite for all streams if not specified.

### Create Destination

Create a new destination connector in Airbyte. Requires a name, workspace, destination type (e.g. "bigquery", "snowflake", "postgres"), and destination-specific configuration with credentials and connection settings.

### Create Source

Create a new data source connector in Airbyte. Requires a name, workspace, source type (e.g. "postgres", "stripe", "hubspot"), and source-specific configuration with credentials and connection settings.

### Create Workspace

Create a new Airbyte workspace. Workspaces are the organizational unit for grouping sources, destinations, and connections.

### Delete Connection

Permanently delete an Airbyte connection. This removes the link between a source and destination. This action cannot be undone.

### Delete Destination

Permanently delete an Airbyte destination connector. This action cannot be undone.

### Delete Source

Permanently delete an Airbyte source connector. This action cannot be undone.

### Delete Workspace

Permanently delete an Airbyte workspace. This action cannot be undone and will affect all resources within the workspace.

### Get Connection

Retrieve detailed information about a specific Airbyte connection, including its source, destination, schedule, stream configurations, and sync settings.

### Get Destination

Retrieve detailed information about a specific Airbyte destination connector, including its name, type, workspace, and full configuration.

### Get Job

Retrieve the status and details of a specific Airbyte sync or reset job, including progress metrics like bytes synced, rows synced, and duration.

### Get Source

Retrieve detailed information about a specific Airbyte source connector, including its name, type, workspace, and full configuration.

### Get Stream Properties

Retrieve available streams and their schemas for an Airbyte source. Returns stream names, supported sync modes, cursor fields, primary keys, and available properties. Useful for configuring which streams to include in a connection.

### List Connections

List data sync connections in Airbyte. Connections link a source to a destination and define sync behavior. Supports filtering by workspace and pagination.

### List Destinations

List configured destination connectors in Airbyte (data warehouses, databases, lakes, etc.). Supports filtering by workspace and pagination.

### List Jobs

List sync and reset jobs in Airbyte. Filter by connection, job type, status, date range, and workspace. Supports pagination and sorting.

### List Sources

List configured data source connectors in Airbyte. Returns source names, types, workspace associations, and configurations. Supports filtering by workspace and pagination.

### List Workspaces

List Airbyte workspaces. Workspaces are organizational units that group sources, destinations, and connections. Supports filtering and pagination.

### List Permissions

List permissions in Airbyte. Filter by user or organization to see role-based access assignments across workspaces and organizations.

### List Tags

List all tags in Airbyte. Tags can be used to organize and categorize resources. Optionally filter by workspace.

### Trigger Sync Job

Trigger a sync or reset job on an Airbyte connection. A sync job moves data from source to destination. A reset job clears previously synced data at the destination.

### Update Connection

Update an existing Airbyte connection. Modify the name, status, schedule, stream configurations, or other settings. Only provided fields will be updated.

### Update Destination

Update an existing Airbyte destination connector. Modify the destination name and/or its configuration. Only provided fields will be updated.

### Update Source

Update an existing Airbyte source connector. Modify the source name and/or its configuration. Only provided fields will be updated.

### Update Workspace

Update an existing Airbyte workspace. Modify the workspace name or notification settings.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
