# Slates Specification for PlanetScale

## Overview

PlanetScale is a managed database platform powered by Vitess (MySQL-compatible) and also offering PostgreSQL-compatible databases. It provides scale, performance, and reliability with features like horizontal sharding, non-blocking schema changes, and branching workflows. The API allows programmatic management of databases, branches, deploy requests, passwords, and other platform features.

## Authentication

PlanetScale's API supports two authentication methods:

### Service Tokens

To get started with the PlanetScale API, you only need to create a service token and grant it access based on the endpoints you want to use. Service tokens are created in the PlanetScale dashboard under **Settings > Service tokens**.

To make requests, add the service token values in the Authorization header: `Authorization: <SERVICE_TOKEN_ID>:<SERVICE_TOKEN>`

Service tokens are configured with granular permissions for both organization and database access. Permissions include things like `read_database`, `create_branch`, `read_deploy_request`, `connect_branch`, `write_backups`, etc. Each API endpoint documents the specific service token access permissions it requires.

### OAuth 2.0

OAuth applications enable you to seamlessly integrate your platform with PlanetScale, and allow your users to give granular PlanetScale account access to your platform in return.

OAuth tokens use a Bearer token format: `Authorization: Bearer <token>`

OAuth scopes are organized at four levels:

- **User access**: `read_user`, `write_user`, `read_organizations`
- **Organization access**: Scopes for managing databases, branches, deploy requests, members, backups, passwords, comments, and invoices (e.g., `read_databases`, `create_databases`, `write_branches`, `read_deploy_requests`, `approve_deploy_requests`)
- **Database access**: Similar to organization-level but scoped to a specific database
- **Branch access**: Scopes for individual branch operations (e.g., `read_branch`, `write_branch`, `manage_passwords`, `read_backups`)

The API base URL is `https://api.planetscale.com/v1`. All resources are scoped under organizations: `/organizations/{organization}/...`

## Features

### Database Management

Create, read, update, and delete databases within an organization. Databases can be configured in specific regions with specific cluster sizes. PlanetScale supports both Vitess (MySQL-compatible) and PostgreSQL-compatible databases, each with different feature sets.

### Branch Management

Automatically create and delete database branches from CI/CD pipelines or data migration tooling. Branches are isolated copies of your database schema that can be used for development and testing. Branches can be created from a parent branch, from a backup, or from a point-in-time restore (PostgreSQL only). Branches can be promoted to production status.

### Deploy Requests (Vitess only)

Users can manage the lifecycle of a deploy request — a mechanism similar to pull requests but for database schema changes. Deploy requests can be created, approved, queued, deployed, reverted, and closed programmatically. Supports comments on deploy requests. Admin approval can be required, and a service token cannot approve its own deploy request.

### Connection Credential (Password) Management

Automate creating and deleting database connection strings for internal users or tools. Passwords are scoped to specific branches and can be configured with specific roles (e.g., read-only, read-write, admin).

### Backup Management

Create, list, read, and delete backups for database branches. Backups can be restored to new branches. Production branch backups have separate permissions for additional safety.

### Organization and Member Management

List and manage organizations, members, and teams. View invoices. Manage audit logs for compliance and security tracking.

### Query Insights

Access query insights reports to analyze database query performance and detect anomalies. Schema recommendations are also available through the API.

### Service Token Management

List, view, create, and delete service tokens without using the dashboard or CLI.

### Webhook Management

Create, update, list, and delete webhooks for databases via the API. Each database can have up to 5 webhooks. Webhooks can be scoped to specific event types.

### Vitess-specific Features

Manage keyspaces and VSchemas, configure sharding, manage safe migrations, control deploy request throttling, and run workflows for Vitess databases.

### Postgres-specific Features

Manage cluster extensions, cluster parameters, dedicated PgBouncers, IP restrictions, and database roles for PostgreSQL databases.

## Events

Webhooks in PlanetScale allow you to trigger an HTTP POST callback to a configured URL when specific events happen within your PlanetScale organization. Webhooks can be used to build integrations, such as notifications, and automate workflows.

Webhooks are configured per database and deliver signed payloads (SHA-256 HMAC via `X-PlanetScale-Signature` header).

### Branch Events

- **Branch ready** (`branch.ready`): A branch has been created and is ready to connect.
- **Branch sleeping** (`branch.sleeping`): A branch has entered a sleeping state.
- **Branch anomaly** (`branch.anomaly`): A new query anomaly has been detected in PlanetScale Insights for the branch.
- **Branch primary promoted** (`branch.primary_promoted`): A new primary has been promoted (Postgres).
- **Branch out of memory** (`branch.out_of_memory`): A Postgres database experienced an OOM event and restarted. Sends at most once every 30 minutes.
- **Branch start maintenance** (`branch.start_maintenance`): A production branch is about to start a maintenance window. Available for both Vitess (enterprise only) and Postgres.

### Deploy Request Events (Vitess only)

- **Opened** (`deploy_request.opened`): A deploy request has been opened.
- **Queued** (`deploy_request.queued`): A deploy request has been added to the deploy queue.
- **In progress** (`deploy_request.in_progress`): A deploy request has started running.
- **Pending cutover** (`deploy_request.pending_cutover`): A deploy request is ready and waiting for user confirmation.
- **Schema applied** (`deploy_request.schema_applied`): The schema change has been successfully applied.
- **Errored** (`deploy_request.errored`): A deploy request has stopped due to an error.
- **Reverted** (`deploy_request.reverted`): A deploy request has been reverted.
- **Closed** (`deploy_request.closed`): A deploy request has been closed.

### Storage Events

- **Cluster storage** (`cluster.storage`): A Postgres database has crossed a storage threshold (60%, 75%, 85%, 90%, 95%).
- **Keyspace storage** (`keyspace.storage`): A Vitess keyspace (Metal only) has crossed a storage threshold (60%, 75%, 85%, 90%, 95%).

### Access Events

- **Database access request** (`database.access_request`): PlanetScale staff has initiated an access request to your organization for support purposes.
