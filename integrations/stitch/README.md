# <img src="https://provider-logos.metorial-cdn.com/stitch.png" height="20"> Stitch

Manage data pipelines that replicate data from SaaS applications, databases, and other sources into data warehouses like Redshift, BigQuery, Snowflake, and PostgreSQL. Create and configure data sources (integrations), set up destination warehouses, select streams and fields for replication, and schedule extraction frequency. Push arbitrary data via the Import API using JSON payloads with schema validation. Monitor extraction and load job status, manage post-load webhook notifications that trigger when data loading completes, and configure custom email notifications. Supports partner account provisioning, OAuth source configuration, and upsert or append-only loading behavior.

## Tools

### Create Source

Creates a new data source (integration) in Stitch. After creation, the source may require additional configuration steps (OAuth, field selection) before it becomes fully configured and starts replicating data.

### Delete Source

Permanently deletes a data source (integration) from the Stitch account. This stops all data replication for the source and removes its configuration.

### Get Source

Retrieves detailed information about a specific data source (integration) including its configuration properties, connection status, and report card. Can also check the last connection status.

### List Source Types

Lists all available data source types that can be configured in Stitch, or retrieves the configuration details for a specific source type. Use this to discover available integrations and understand what properties are required to create a source.

### List Sources

Lists all configured data sources (integrations) in the Stitch account. Returns source metadata including type, name, status, and configuration details. Use this to get an overview of all data pipelines or find a specific source ID.

### Get Destination

Retrieves the current destination (data warehouse) configuration. Stitch supports only a single destination per account. Also supports listing available destination types for discovery.

### List Notifications

Lists all configured notifications for the Stitch account, including custom email recipients and post-load webhook hooks. Use this to see the current notification setup.

### List Streams

Lists all available streams (tables) for a data source, including their selection status and replication metadata. Use this to discover what data is available for replication and which streams are currently selected.

### Push Data

Pushes data records into Stitch via the Import API (Batch endpoint). Use this to send data from any source — including sources Stitch doesn't have a native integration for — into the destination warehouse. Supports both upsert (with primary keys) and append-only (without primary keys) loading.

### Start Replication

Initiates a replication (sync) job for a data source. This triggers Stitch to extract data from the source and load it into the destination. The source must be fully configured before starting replication.

### Update Source

Updates an existing data source's configuration. Can modify display name, connection properties, replication schedule, and pause/resume the source. The source type cannot be changed after creation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
