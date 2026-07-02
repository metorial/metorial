# <img src="https://provider-logos.metorial-cdn.com/neon.png" height="20"> Neon

Manage serverless PostgreSQL databases on Neon. Create, update, recover, and delete projects and branches. Manage databases, compute endpoints, roles, connection URIs, supported regions, snapshots, and operation status. Configure autoscaling limits, suspend timeouts, password storage, and branch history retention. Track paid-plan consumption history for eligible accounts.

## Tools

### List Regions

Lists supported Neon regions.

### List Projects

Lists Neon projects accessible to the authenticated user, including recoverable deleted projects when requested.

### Get Project

Retrieves detailed information about a specific Neon project.

### Create Project

Creates a Neon project with optional region, Postgres version, default branch, database, role, password-storage, and branch-history settings.

### Update Project

Updates a Neon project's name or branch-history retention.

### Delete Project

Deletes a Neon project and all of its branches, databases, endpoints, and roles.

### Recover Project

Recovers a deleted Neon project within the deletion recovery period.

### List Branches

Lists branches in a Neon project, with search, sort, pagination, and recoverable-deleted branch support.

### Get Branch

Retrieves details for a specific Neon branch.

### Create Branch

Creates a Neon branch, optionally from a parent timestamp or LSN and optionally with a compute endpoint.

### Update Branch

Updates a Neon branch name, protected flag, or expiration timestamp.

### Set Default Branch

Sets a branch as the default branch for a Neon project.

### Delete Branch

Deletes a branch from a Neon project.

### Restore Branch

Restores a branch to a previous state using a point-in-time timestamp or LSN.

### Recover Branch

Recovers a soft-deleted Neon branch within the deletion recovery period when available.

### List Databases

Lists databases on a specific branch.

### Get Database

Retrieves details for a specific database on a branch.

### Create Database

Creates a database on a branch.

### Update Database

Renames a database or changes its owner role.

### Delete Database

Deletes a database from a branch.

### List Endpoints

Lists compute endpoints in a Neon project.

### Get Endpoint

Retrieves details for a specific compute endpoint.

### Create Endpoint

Creates a compute endpoint for a branch.

### Update Endpoint

Updates compute endpoint name, autoscaling, suspend timeout, disabled, or passwordless access settings.

### Delete Endpoint

Deletes a compute endpoint.

### Control Endpoint

Starts, suspends, or restarts a compute endpoint.

### List Roles

Lists database roles on a branch.

### Get Role

Retrieves details for a database role.

### Create Role

Creates a database role on a branch.

### Delete Role

Deletes a database role from a branch.

### Reset Role Password

Rotates and returns the password for a database role.

### Reveal Role Password

Retrieves the stored password for a database role when password storage is enabled.

### List Operations

Lists recent operations for a Neon project.

### Get Operation

Retrieves the status of a specific Neon operation.

### Get Connection URI

Retrieves a PostgreSQL connection URI for a Neon database and role.

### List Snapshots

Lists snapshots for a Neon project.

### Create Snapshot

Creates a point-in-time snapshot from a Neon branch.

### Update Snapshot

Renames a Neon project snapshot.

### Delete Snapshot

Deletes a Neon project snapshot.

### Restore Snapshot

Restores a Neon snapshot to a branch.

### Get Consumption

Retrieves consumption history for eligible paid Neon plans.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
