# <img src="https://provider-logos.metorial-cdn.com/neon.png" height="20"> Neon

Manage serverless PostgreSQL databases on Neon. Create, update, and delete projects, branches, databases, compute endpoints, and roles. Configure autoscaling limits, suspend timeouts, and read replicas. Create branches from any point in time for development, testing, or backups. Compare schemas between branches and create anonymized data copies. Track consumption metrics including compute time, storage, and data transfer, and set quota limits. Manage organization members, permissions, and API keys. Monitor asynchronous operation status and query databases over HTTP via the Data API.

## Tools

### Create Branch

Creates a new branch in a Neon project. Branches are copies of the parent branch's data at a specific point in time. Optionally creates a compute endpoint for the branch so it can accept connections.

### Create Project

Creates a new Neon project. A project is the top-level organizational unit that contains branches, databases, and compute endpoints. You can specify the region, Postgres version, and default compute settings.

### Delete Branch

Deletes a branch from a Neon project. This also deletes all databases, roles, and compute endpoints associated with the branch.

### Delete Project

Permanently deletes a Neon project and all its branches, databases, endpoints, and roles. The project can be recovered within the deletion grace period using the recover project tool.

### Get Consumption

Retrieves consumption metrics across all projects for the account. Tracks compute time, active time, storage, written data, and data transfer. Available on Neon paid plans.

### Get Project

Retrieves detailed information about a specific Neon project, including its configuration, connection URI, consumption metrics, and settings.

### List Branches

Lists all branches in a Neon project. Branches contain databases and can be created from any point in the project's history retention window.

### List Operations

Lists recent operations for a Neon project. Operations are asynchronous tasks like creating branches, starting compute endpoints, or applying configuration changes. Use this to track the progress and status of background tasks.

### List Projects

Lists all Neon projects accessible to the authenticated user. Supports searching by name or ID and filtering by organization. Returns project metadata including region, Postgres version, and timestamps.

### List Databases

Lists all databases on a specific branch in a Neon project. Each database belongs to a branch and has an owner role.

### List Endpoints

Lists all compute endpoints in a Neon project. Endpoints are processing instances that connect to branches and provide database connectivity.

### List Roles

Lists all database roles on a specific branch. Roles control database access and permissions. They are copied to child branches upon creation.

### Restore Branch

Restores a branch to a previous state using a point-in-time timestamp or LSN. Optionally preserves the current state under a new branch name before restoring.

### Update Project

Updates an existing Neon project's settings, including its name and default endpoint configuration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
