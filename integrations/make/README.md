# <img src="https://provider-logos.metorial-cdn.com/make.png" height="20"> Make

Manage no-code automation workflows (scenarios) on the Make platform. Create, run, activate, deactivate, clone, and delete scenarios. Manage scenario blueprints, execution logs, and consumption statistics. Create and verify app connections. Manage data stores and their records, define data structures, and handle webhooks. Organize teams, users, and organizations with role-based access. Build and manage custom app integrations via the SDK. Access analytics, audit logs, and incomplete executions for debugging. Manage AI agents, encryption keys, devices, and notification preferences.

## Tools

### Create Scenario

Create a new automation scenario in a Make team. Optionally provide a blueprint JSON definition, scheduling configuration, and folder assignment.

### Get Scenario Logs

Retrieve execution logs for a specific scenario. Shows recent execution history including timestamps, statuses, and operations consumed. Useful for debugging and monitoring scenario performance.

### Get Usage

Retrieve usage statistics for an organization or team. Returns daily operations count, data transfer, and centicredits usage for the past 30 days.

### List Connections

Retrieve all connections for a given team. Connections represent authenticated links to external services used in scenarios.

### List Data Stores

Retrieve all data stores for a team. Data stores persist structured data across scenario executions and enable data sharing between scenarios.

### List Webhooks

Retrieve all webhooks (hooks) for a team. Hooks are incoming trigger endpoints that receive data from external services and can initiate scenario executions. Filter by type or assignment status.

### List Organizations

Retrieve all organizations that the authenticated user is a member of. Returns organization IDs, names, and zone information.

### List Scenarios

Retrieve a list of automation scenarios from Make. Filter by team, organization, folder, or active status. Returns scenario names, IDs, scheduling details, and current state.

### List Teams

Retrieve all teams belonging to an organization. Teams are the primary container for scenarios, connections, and other Make resources.

### List Users

Retrieve all users for a team or organization. Returns user profiles including name, email, and last login information.

### Manage Connection

Get details, rename, verify, or delete a connection. Use "verify" to test whether stored credentials are still valid with the external service.

### Manage Data Store Records

List, get, create, update, or delete records within a Make data store. Use this to interact with individual records stored in a data store.

### Manage Data Store

Get details, create, update, or delete a data store. Data stores persist structured data between scenario runs and enable data sharing across scenarios.

### Manage Webhook

Get details, create, rename, enable, disable, ping, or delete a webhook (hook). Use "ping" to check if the hook endpoint is responsive. Use "enable"/"disable" to control whether the hook accepts incoming data.

### Manage Scenario

Get details, update, activate, deactivate, run, clone, or delete an automation scenario. Supports one-off execution, cloning to another team, and retrieving blueprint or usage information.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
