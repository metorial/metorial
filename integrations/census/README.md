# <img src="https://provider-logos.metorial-cdn.com/census.png" height="20"> Census

Manage reverse ETL syncs that move data from cloud data warehouses (Snowflake, BigQuery, Redshift, Databricks) into 200+ business applications like Salesforce, HubSpot, and Google Ads. Create, configure, trigger, and monitor data syncs with support for upsert, update-only, create-only, mirror, append, and delete behaviors. View sync run statuses and detailed record counts. List and manage source and destination connections. Retrieve dataset records via the Dataset API. Manage organization workspaces, users, and invitations. Configure webhooks for sync alert events. Build embedded reverse ETL experiences with Connect Links and Sync Management Links.

## Tools

### Create Sync

Creates a new data sync that moves data from a source (data warehouse) to a destination (SaaS tool). Configure the source object, destination object, field mappings, sync behavior, and schedule.

### Delete Sync

Permanently deletes a sync configuration. This does not affect data already synced to the destination, but stops all future sync runs.

### Get Dataset Record

Retrieves a single record from a Census dataset by its primary key. Datasets make warehouse data accessible via API. Can also list all available datasets when no datasetId is provided.

### Get Sync Runs

Retrieves sync run history and status for a specific sync. Use this to monitor sync progress, check for failures, and view record-level statistics. Can also fetch a single sync run by ID.

### Get Sync

Retrieves the full configuration and current status of a specific sync, including source and destination details, field mappings, schedule, and notification settings.

### List Connections

Lists source connections (data warehouses like Snowflake, BigQuery, Redshift) and/or destination connections (SaaS tools like Salesforce, HubSpot, Braze). Specify the connection type to filter, or retrieve both.

### List Syncs

Lists all data syncs configured in the Census workspace. Returns sync configurations including source, destination, operation type, schedule, and current status. Use pagination parameters to navigate large lists.

### List Webhooks

Lists all webhooks configured in the Census workspace, including their endpoint URLs, subscribed event types, and descriptions.

### Manage Webhook

Creates, updates, or deletes a Census webhook. Webhooks notify external HTTPS endpoints when sync alert events occur (e.g., sync failures, alert resolution). Specify an action: "create" to register a new webhook, "update" to modify an existing one, or "delete" to remove it.

### Trigger Sync

Programmatically triggers a sync run. By default, performs an incremental sync. Set forceFullSync to true to force a complete resync of all records.

### Update Sync

Updates the configuration of an existing sync. Allows modifying the label, operation, schedule, mappings, pause state, and notification settings. Only specified fields are updated; omitted fields remain unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
