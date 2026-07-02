# <img src="https://provider-logos.metorial-cdn.com/render-logo.svg" height="20"> Render

Deploy and manage cloud infrastructure including web services, APIs, background workers, static sites, and cron jobs. Trigger, cancel, and roll back deployments. Create and manage Postgres databases and Redis-compatible key value stores. Configure autoscaling rules, persistent disks, custom domains, and environment variables. Monitor services with logs and metrics (CPU, memory, HTTP requests, bandwidth). Manage projects, environments, blueprints (infrastructure as code), environment groups, registry credentials, and workspace members. Run one-off jobs and workflows. Receive webhook notifications for deployment lifecycle, service availability, scaling, database, and infrastructure events.

## Tools

### Get Metrics

Retrieve performance metrics for a Render resource. Supports CPU, memory, HTTP requests, HTTP latency, bandwidth, disk usage, instance count, active database connections, and replication lag.

### Get Service

Retrieve detailed information about a specific Render service including its configuration, deployment settings, environment, plan, region, and current status.

### List Deployments

List recent deployments for a Render service. Shows deployment history including status, commit, and timestamps.

### List Postgres Databases

List all Render Postgres database instances. Optionally filter by workspace/owner ID.

### List Services

List all services in your Render account. Filter by workspace, service type, or name. Returns service metadata including type, status, repository, branch, and URL.

### List Workspaces

List all Render workspaces accessible to the authenticated user. Returns workspace IDs, names, and details.

### Manage Custom Domains

Add, list, verify, or delete custom domains on a Render service. Use **list** to see configured domains, **add** to attach a new domain, **verify** to check DNS configuration, or **delete** to remove a domain.

### Manage Deployments

Trigger, cancel, or rollback deployments for a Render service. Trigger deploys optionally for a specific commit or Docker image. Cancel an in-progress deploy or rollback to a previous successful deploy.

### Manage Persistent Disks

Manage persistent disks on Render services. Supports **list** (disks for a service), **add**, **get**, **update**, **delete**, **list_snapshots**, and **restore_snapshot** actions.

### Manage Environment Groups

Manage Render environment groups — shared sets of environment variables that can be linked to multiple services. Supports **list**, **get**, **create**, **update**, **delete**, **link_service**, **unlink_service**, **set_var**, and **delete_var** actions.

### Manage Environment Variables

List, set, or delete environment variables on a Render service. Use **list** to view all env vars, **set** to add/update one or more variables, or **delete** to remove a variable by key name.

### Manage Jobs

Manage Render cron job runs and one-off jobs. **trigger_cron** runs a cron job immediately, **cancel_cron** cancels a cron job run, **create_job** creates a one-off job, **list_jobs** lists one-off jobs, and **cancel_job** cancels a one-off job.

### Manage Key Value Store

Manage Render Key Value (Redis-compatible) instances. Perform actions such as **list**, **get**, **create**, **update**, **delete**, **suspend**, **resume**, or retrieve **connection_info**.

### Manage Postgres Database

Manage Render Postgres databases. Perform lifecycle actions such as **get**, **create**, **update**, **delete**, **suspend**, **resume**, **restart**, or **failover**. Also supports retrieving **connection_info** and triggering a database **export**.

### Manage Projects

Manage Render projects and environments. Supports **list**, **get**, **create**, **update**, and **delete** for projects. Also supports **list_environments** and **create_environment** within a project.

### Manage Service

Perform lifecycle actions on a Render service: **suspend**, **resume**, **restart**, or **delete**. Use this to control service state without modifying its configuration.

### Query Logs

Query service logs from Render. Filter by resource, time range, log level, and search text. Returns recent log entries for debugging and monitoring.

### Scale Service

Scale a Render service manually or configure autoscaling. Use **manual** to set a fixed instance count, **autoscale** to configure CPU/memory-based autoscaling rules, or **disable_autoscale** to remove autoscaling and revert to manual scaling.

### Update Service

Update the configuration of an existing Render service. Supports changing name, build/start commands, auto-deploy, branch, plan, health check path, and more.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
