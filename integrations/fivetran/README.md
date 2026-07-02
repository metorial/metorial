# <img src="https://provider-logos.metorial-cdn.com/fivetran.png" height="20"> Fivetran

Manage automated data pipelines that extract data from hundreds of sources and load it into data warehouses, lakes, and other destinations. Create, configure, pause, and monitor connectors (connections) for SaaS apps, databases, events, and files. Manage groups, destinations, and schema configurations including selecting which schemas, tables, and columns to sync. Trigger manual syncs and historical re-syncs. Create and schedule transformations using dbt Core, dbt Cloud, or Coalesce. Manage users, teams, roles, and permissions. Configure webhooks for sync, transformation, and dbt run events. Manage hybrid deployment agents, private links, proxy agents, certificates, log services, and system API keys.

## Tools

### List Connections

List all connections (connectors) in the Fivetran account, or within a specific group. Returns summary information about each connection including its status, service type, and sync state.

### List Connector Types

List all available connector (source) types supported by Fivetran. Use this to discover available services and their IDs when creating new connections.

### List Groups

List all groups in the Fivetran account. Groups are organizational containers that hold destinations, connectors, users, and other resources.

### Get Connection Schema

Retrieve the schema configuration for a connection, including which schemas, tables, and columns are enabled or disabled for syncing.

### Get Connection

Retrieve full details of a specific connection (connector), including its configuration, status, and setup test results.

### List Destinations

List all destinations in the Fivetran account. Each destination is a data warehouse or storage service that receives synced data from connections.

### Get Group

Retrieve details of a specific group, including its connections and users.

### List Teams

List all teams in the Fivetran account with their roles and descriptions.

### List Transformations

List all transformations in the Fivetran account. Transformations reshape synced data using dbt Core, dbt Cloud, or Coalesce.

### List Users

List all users in the Fivetran account with their roles, status, and contact information.

### List Webhooks

List all webhooks configured in the Fivetran account. Webhooks notify external URLs when events like syncs, transformations, or status changes occur.

### Trigger Sync

Trigger a manual data sync for a connection. Optionally force a full re-sync to reload all historical data. Use this when you need data synced immediately instead of waiting for the scheduled sync.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
