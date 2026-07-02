Now let me get more details on the webhook event types:Now I have comprehensive information. Let me also check the authentication details more closely:I now have all the information I need. Let me compile the specification.

# Slates Specification for Render

## Overview

Render is a cloud platform for deploying and managing web applications, APIs, databases, cron jobs, and background workers. It provides a REST API that offers programmatic access to nearly all the functionality available in its dashboard, including service management, deployments, datastores, monitoring, and infrastructure configuration.

## Authentication

Render uses **API key** authentication for all API requests.

- **Type:** Bearer token
- **Header:** `Authorization: Bearer <API_KEY>`
- **API Base URL:** `https://api.render.com/v1`

**How to obtain an API key:**

1. Navigate to your **Account Settings** page in the Render Dashboard.
2. Create a new API key. The key is shown in full only at creation time — copy and store it securely.

**Key details:**

- An API key provides access to **all workspaces** the user belongs to.
- API keys do not expire, unlike CLI session tokens.
- If an API key is compromised, revoke it in the Render Dashboard and create a new one.

**No OAuth2 or other authentication methods are supported.** There are no scopes — the key grants access equivalent to the user's permissions across all their workspaces.

## Features

### Service Management

Create, update, delete, suspend, resume, and restart services. Supports multiple service types: web services, private services, background workers, static sites, and cron jobs. Services can be backed by Git repositories or Docker images. Manage environment variables, secret files, and instance types per service.

### Deployments

Trigger, cancel, and roll back deployments for services. View deployment history and status. Supports image-based service previews.

### Scaling & Autoscaling

Manually scale the instance count for services. Configure autoscaling rules based on CPU and memory utilization targets, including setting minimum and maximum instance counts.

### Postgres Database Management

Create and manage fully managed Postgres database instances. Retrieve connection information, manage database users/credentials, trigger and monitor backups/exports, perform point-in-time recovery, manage read replicas, configure high availability, and trigger failovers. Supports suspending, resuming, and restarting instances.

### Key Value (Redis-compatible) Store Management

Create and manage Key Value instances. Retrieve connection information. Suspend, resume, update, and delete instances.

### Persistent Disks

Attach, update, and delete persistent disks on services. List and restore disk snapshots.

### Custom Domains

Add, retrieve, verify DNS configuration for, and delete custom domains on services.

### Cron Jobs & One-Off Jobs

Trigger and cancel cron job runs. Create, list, retrieve, and cancel one-off jobs.

### Workflows (Early Access)

Create and manage workflows — stateful application logic and async workloads. Deploy workflow versions, define tasks, run tasks, and monitor task runs. Supports real-time event streaming via SSE for task run events.

### Projects & Environments

Organize resources into projects and environments. Add or remove resources from environments.

### Blueprints (Infrastructure as Code)

List, retrieve, update, and disconnect blueprints. Validate blueprint configurations and view sync history. Blueprints define entire application architectures in a single YAML file.

### Environment Groups

Create shared sets of environment variables and secret files that can be linked to multiple services. Manage variables and secret files within groups, and link/unlink services.

### Registry Credentials

Manage credentials for external Docker registries to support image-backed service deployments.

### Monitoring — Logs

Query and subscribe to service logs. Configure syslog streaming to external logging providers with per-resource overrides.

### Monitoring — Metrics

Retrieve service metrics including CPU usage, memory usage, HTTP request counts, HTTP latency, bandwidth, disk usage, instance count, active database connections, and replication lag. Configure OpenTelemetry metrics streaming to external providers.

### Notification Settings

Configure email and Slack notification preferences at the workspace level and per-service overrides.

### Workspace & Team Management

List workspaces, retrieve workspace details, manage workspace members and their roles. View audit logs at the workspace and organization level. Retrieve the currently authenticated user.

### Maintenance

List, retrieve, update, and trigger maintenance runs for services.

## Events

Render supports **webhooks** to notify external systems when service events occur. Webhooks are available on Professional plans and higher. Webhooks follow the [Standard Webhooks](https://www.standardwebhooks.com/) specification and deliver HTTPS POST requests with signed payloads to a user-specified endpoint.

Webhooks can also be managed programmatically via the API (create, list, update, delete webhooks, and list webhook events).

Each webhook can subscribe to any combination of the following event categories:

### Deployment Lifecycle

Events for build and deploy start/end (with success/failure/canceled status), pre-deploy command start/end, image pull failures, one-off job run completion, commit ignored, and branch deleted.

### Service Availability

Events for server availability changes (available, failed, hardware failure, restarted), service suspension and resumption, maintenance window start/end, maintenance mode toggling, and zero-downtime redeploy start/end.

### Scaling

Events for manual instance count changes, autoscaling start/end, and autoscaling configuration changes.

### Service Configuration

Events for instance type (plan) changes.

### Cron Jobs

Events for cron job run start and end (with success/failure/canceled status).

### Postgres Database

Events covering database creation, availability changes, backup start/end/failure, point-in-time recovery checkpoints and restores, failovers, restarts, credential changes, disk size changes, high availability toggling, version upgrades, read replica changes, WAL archive failures, and disk autoscaling toggling.

### Key Value Store

Events for Key Value instance availability, restarts, and unhealthy status.

### Persistent Disks

Events for disk creation, updates, and deletion.
