# <img src="https://provider-logos.metorial-cdn.com/cloudflare.png" height="20"> Cloudflare Workers

Manage Cloudflare Workers serverless scripts, versions, and deployments on Cloudflare's global edge network. Create, list, update, download, and delete Worker scripts. Manage versions and deployments independently, supporting gradual rollouts. Configure bindings to external resources like KV, D1, R2, Durable Objects, Queues, and environment variables. Add, list, and delete encrypted secrets. Set up and update cron triggers for scheduled execution. Manage custom domains, routes, and workers.dev subdomains. Stream real-time logs via Tail, configure Logpush for log forwarding, and query observability telemetry data. Supports Workers for Platforms (dispatch namespaces) for multi-tenant use cases.

## Tools

### Delete Worker

Delete a Worker script from the account. Optionally force-deletes associated resources like bindings and durable objects.

### Get Worker Details

Retrieve detailed metadata and settings for a specific Worker script including bindings, compatibility settings, observability config, and placement.

### Get Worker Version

Retrieve detailed information about a specific Worker version, including its bindings, runtime configuration, and startup time.

### List Workers

List all Worker scripts in the account. Returns metadata for each script including handlers, compatibility settings, and deployment info.

### List Worker Versions

List all versions of a Worker script. Optionally filter to only deployable versions. Versions are created separately from deployments—a version can exist without being deployed.

### List Deployments

List all deployments for a Worker script. The first deployment in the list is the active one serving traffic. Each deployment shows the version(s) and their traffic percentages for gradual rollouts.

### List Worker Domains

List all custom domains attached to Workers in the account. Each domain maps a hostname on a Cloudflare zone to a specific Worker.

### List Worker Routes

List all Worker routes for a Cloudflare zone. Routes map URL patterns to Worker scripts.

### Get Cron Triggers

Retrieve all cron trigger schedules configured for a Worker. Cron Triggers run the Worker's scheduled() handler on a recurring schedule (UTC).

### List Secrets

List all secret bindings on a Worker script. Returns secret names and types only — secret values are never exposed after creation.

### Get Worker Settings

Retrieve the full settings and bindings configuration for a Worker script, including environment variables, KV namespaces, R2 buckets, D1 databases, Queues, Durable Objects, and other bindings.

### Get Workers Subdomain

Retrieve the account's workers.dev subdomain and optionally check whether a specific Worker is enabled on it.

### Start Tail Session

Start a real-time log tail for a Worker script. Returns a WebSocket URL that streams logs and exceptions from the Worker as they occur. Useful for live debugging.

### Query Observability

Run an observability query against Workers telemetry data. Query logs, metrics, and analytics across all Workers in the account within a time range.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
