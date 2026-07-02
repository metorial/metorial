# <img src="https://provider-logos.metorial-cdn.com/planetscale.png" height="20"> Planetscale

Manage PlanetScale databases, branches, and schema changes programmatically. Create, read, update, and delete databases and branches. Manage deploy requests for non-blocking schema migrations (Vitess). Create and rotate connection credentials (passwords) for branches. Create, protect, and restore backups. List regions and cluster sizes for database provisioning. Manage organization details, members, service tokens, audit logs, and webhooks.

## Tools

### Create Branch

Create a new branch for a PlanetScale database. Branches are isolated copies of your database schema used for development and testing. Can be created from a parent branch, from a backup, or via point-in-time restore (PostgreSQL only).

### Create Database

Create a new PlanetScale database. Supports both Vitess (MySQL-compatible) and PostgreSQL engines. Configure the cluster size, region, and high-availability replicas.

### Create Deploy Request

Create a deploy request to merge schema changes from one branch into another (Vitess only). Similar to a pull request but for database schema changes. Optionally enable auto-cutover and auto-deletion of the source branch.

### Delete Database

Permanently delete a PlanetScale database and all its branches, backups, and data. This action cannot be undone.

### Get Database

Retrieve detailed information about a specific PlanetScale database, including its state, region, branch counts, schema settings, and configuration.

### Get Organization

Retrieve details about the configured PlanetScale organization, including plan, billing status, database count, and feature flags.

### List Audit Logs

List audit log entries for the organization. Filter by action type, actor, or date range for compliance and security tracking.

### List Branches

List all branches for a PlanetScale database. Returns branch names, states, production status, and connection details.

### List Cluster Sizes

List PlanetScale cluster sizes available to the configured organization. Use this to choose clusterSize values for database creation and backup restores.

### List Databases

List all databases in the configured PlanetScale organization. Supports search filtering and pagination. Returns database names, states, regions, branch counts, and engine type (Vitess/MySQL or PostgreSQL).

### List Deploy Requests

List deploy requests for a Vitess database. Deploy requests are similar to pull requests but for database schema changes. Filter by state to find open, deployed, or closed requests.

### List Members

List all members of the PlanetScale organization. Returns member names, emails, roles, and join dates.

### List Regions

List PlanetScale regions available to the configured organization. Use this before creating databases or branches that need an explicit region.

### Manage Backup

Create, list, get, update, or delete backups for a database branch. Backups can be used to restore data to a new branch. Configure retention policies, protect backups, and trigger emergency backups (PostgreSQL).

### Manage Branch

Perform management actions on a PlanetScale database branch. Supports promoting to production, demoting from production, enabling/disabling safe migrations, retrieving branch schema, running schema lint, and deleting branches.

### Manage Deploy Request

Perform lifecycle actions on a deploy request. Get details, queue for deployment, cancel, close, approve/review, skip revert period, or complete a revert. Also retrieve deployment status and operations.

### Manage Password

Create, list, update, renew, or delete connection credentials (passwords) for a database branch. Passwords are scoped to a specific branch and can be configured with TTLs, CIDR restrictions, and direct vtgate access. The plaintext password is only returned on creation.

### Manage Service Token

List, create, get, or delete PlanetScale service tokens for the configured organization.

### Manage Webhook

Create, list, update, test, or delete webhooks for a PlanetScale database. Webhooks send HTTP POST callbacks when specific events occur. Each database supports up to 5 webhooks.

### Update Database

Update settings for a PlanetScale database. Toggle deploy request approval requirements, foreign keys, data branching, and query insights.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
