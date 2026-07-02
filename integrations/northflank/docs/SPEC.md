Now let me get more details on the API reference categories and webhook event types:Now I have enough information to write the specification.

# Slates Specification for Northflank

## Overview

Northflank is a full-stack cloud platform for building, deploying, and scaling applications, jobs, and databases. It allows users to seamlessly build, deploy, and scale code, jobs, and databases, operating infrastructure in real-time via UI, API, and CLI. It supports deploying on Northflank's cloud or on your own AWS, GCP, or Azure infrastructure (BYOC).

## Authentication

The Northflank API uses JSON Web Tokens (JWT) for authentication.

Access to most endpoints is restricted and authenticated via a bearer token. Users can generate a personal API token in their account settings in the Northflank application. Team members can generate an API token in that team's settings, provided an API role has been created by a member with permissions.

To authenticate:

1. To create an API token you will first need to create an API role. An API role defines the permissions that a generated token has to access and update resources in your team.
2. Generate an API token from account or team settings in the Northflank web application.
3. The API token must then be included in the Authorization header for the request as a Bearer token:
   ```
   Authorization: Bearer NORTHFLANK_API_TOKEN
   ```

- **Base URL:** `https://api.northflank.com/v1/`
- **Format:** JSON for both requests and responses
- API roles provide granular permissions that control which resources and actions the token can access.

## Features

### Project Management

Create, update, and delete projects that serve as the top-level container for services, addons, secrets, and other resources. Projects can be assigned to a specific region or deployed into a BYOC cluster. Advanced networking settings can be configured per project, including allowed ingress from other projects and Tailscale integration.

### Build Services

Trigger a build of any commit to a repository and deploy it. Build services connect to Git repositories (GitHub, GitLab, Bitbucket, or self-hosted) and build container images using Dockerfiles or buildpacks. Build configuration includes branch/PR restrictions and CI skip flags.

### Deployment Services

Create a new deployment in seconds from an image built on Northflank or an external container registry. Configure instance counts, compute plans, ephemeral storage, health checks, autoscaling, ports (HTTP/TCP/UDP), custom domains, and security policies (basic auth, IP policies).

### Jobs

Run a job with a simple API call. Build a new image for the job or update the environment variables before running. Jobs support manual, scheduled (cron), or event-triggered execution. Runtime environment and deployment configuration can be overridden per run.

### Database & Storage Addons

Create a database addon and retrieve the credentials to begin using it as soon as it's spun up. Supported addon types include PostgreSQL, MongoDB, MySQL, Redis, MinIO, and RabbitMQ. You can deploy databases and other addons, and manage them using the API, including triggering backups. Addons support replica scaling, TLS, external access, point-in-time recovery, and forking from backups.

### Secrets Management

Add groups of build arguments and runtime variables to securely manage secrets for your services. Link credentials from a database or storage addon for immediate and easy access in your project. Secrets can be scoped globally or per-project, restricted to specific resources or tags, and synced with Git repositories via GitOps. Supports secret variables, secret files, and Docker secret mounts.

### Pipelines & Release Flows

Manage your workflow and release your code in an intuitive pipeline. Pipelines organize services, jobs, and addons into stages (e.g., development, staging, production). Release flows automate deployments across stages, including building, promoting images, running jobs, and checking conditions. You can use a webhook trigger to run release flows. Enable the webhook trigger in the template settings and trigger it by making either a GET or POST request. This can be used to quickly integrate with third-party services such as GitHub Actions.

### Preview Environments

Create temporary environments from pipeline templates for testing branches or pull requests. Preview environments can be triggered manually, via API, or via release flows and preview blueprints.

### Infrastructure as Code (Templates)

Define and manage entire project setups as code using Northflank templates. Templates support sequential and parallel workflows, dynamic arguments, node references, functions, conditions, and GitOps-based synchronization. Templates can create projects, services, addons, secrets, pipelines, domains, and more.

### Domains & Networking

Add your domain name to your Northflank account and link it to a public port. Manage domains, subdomains, and TLS certificates. Create public and private HTTP/TCP/UDP ports with (sub)domains, IP policies, and basic auth.

### Container Registries

Register external container registries to pull private images for deployments and jobs. Manage registry credentials and configurations.

### Cloud Providers (BYOC)

Link your own GCP, AWS, or Azure account and use Northflank to deploy workloads into your own cloud environment. Create and manage clusters, nodes (cordon/drain/uncordon), and cloud provider integrations via the API.

### Scaling & Autoscaling

Scale both vertically and horizontally with automatic load balancing. Configure horizontal auto-scaling based on CPU and memory usage thresholds.

### Observability

View live and historical logs and metrics for builds, deployments, jobs, and addons. Retrieve metrics at specific points in time or within time windows via the API. Configure health checks (HTTP, TCP, CMD) for services. Organisations can use audit logs to track actions taken on Northflank and ensure compliance.

### Log Sinks

Integrate external log aggregators by creating log sink configurations. Log sinks can be paused, resumed, and updated.

### Tags

Organize and group resources using tags. Tags can be created, updated, deleted, and applied to various resource types.

### Billing

List invoices and retrieve detailed invoice information via the API.

### Team & Account Management

Manage VCS (version control) provider integrations, list repositories and branches, manage SSH identities, and generate VCS tokens.

## Events

Northflank supports webhook-based notifications for platform events.

### Webhook Notifications

You can create a webhook notification integration to send events to a HTTP endpoint for processing. This can be a powerful tool for automating workflows involving Northflank, especially when combined with the Northflank API.

- You can select the types of event you want to receive notifications about and choose to only receive notifications about events in specific projects.
- You can add a secret to your webhook to ensure the request originated from your Northflank notification integration.
- Webhook notification integrations can be created, read, updated, and deleted via the API.

### Event Categories

- **Build events**: Notifications when builds start, succeed, or fail.
- **Job run events**: Notifications when job runs start, complete, or fail.
- **Backup events**: Notifications when addon backups succeed or fail.
- **Billing events**: Notifications related to billing activity.
- **Autoscaling events**: Notifications when autoscaling actions occur.
- **Infrastructure alerts**: Notifications when running containers crash, have high CPU and memory usage, or when volumes have limited space available. Includes container crash/eviction alerts, volume usage alerts (75%/90% thresholds), and cluster alerts for BYOC environments.

All event categories can be filtered by project scope and configured independently per integration. You can set a limit on how often you will receive a notification for each type of infrastructure alert.
