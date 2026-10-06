# Runpod Integration Specification

## Authentication

Connect with a Runpod API key from **Credentials > API Keys**. Requests use an
`Authorization: Bearer` header. Read-only or restricted keys may permit only
some tools; use a key with the resource permissions needed for the workflow.
There is no required workspace or account configuration.

## API contracts

Resource management uses `https://api.runpod.io/v2`. The former REST v1 API is
deprecated and scheduled to retire on November 15, 2026. Tool field names remain
compatible with existing calls; request payloads translate to the nested v2
container, compute, storage, worker, and scaling objects.

Serverless job operations use `https://api.runpod.ai/v2/{endpointId}`. Account
identity uses the documented GraphQL `myself` query at
`https://api.runpod.io/graphql`, because REST v2 has no current-user endpoint.

## Capabilities

- **Discovery:** `list_compute_types` returns GPU model IDs and Serverless GPU
  pool IDs, CPU flavor IDs, memory, and prices. `list_data_centers` returns
  location IDs, storage tiers, region, and compliance information.
- **Pods:** List, get, create, update, start, stop, restart, and terminate.
  Pod creation selects exactly one GPU model or CPU flavor. CPU Pods require a
  vCPU count and cannot use host-local persistent storage. Pod mount kind cannot
  change after creation. Network volumes and persistent mounts are mutually
  exclusive.
- **Queue-based Serverless endpoints:** Create from a Serverless template,
  list, get, update, and delete. List and get distinguish queue-based and
  load-balancing endpoints; job operations and queue health apply only to
  queue-based endpoints. Read optional worker details. CPU
  endpoints accept CPU flavor IDs; GPU endpoints accept GPU model IDs (translated to eligible pools and model exclusions) or explicit GPU pool IDs. Compute
  family cannot change after creation. Scaling uses queue delay or request
  count; minimum workers cannot exceed maximum workers.
  Model selection excludes other models currently listed in the selected
  pools; later provider additions to those pools can become eligible.
- **Jobs:** Submit asynchronously or synchronously, read status and incremental
  stream chunks, cancel, retry failed/timed-out jobs, and purge queued jobs.
  A streaming handler is required for incremental output. Sync submission waits
  up to 90 seconds and may return a still-running job ID. Results expire after
  one minute for sync jobs and thirty minutes for async jobs. Custom execution
  timeouts range from five seconds to seven days; job TTL ranges from ten
  seconds to seven days. Handler inputs and results are model-specific JSON.
- **Templates:** Create, list owned and public catalog templates, get, update,
  and delete. Templates resolve into deployment configuration when creating a
  Pod or endpoint; later template edits do not update existing deployments.
- **Network volumes:** Create, list, get, rename, increase storage, and delete.
  Volume capacity is 10–4096 GB and cannot be reduced. Volumes must share a data
  center with their compute resources.
- **Private registries:** Create, list, inspect, and delete saved credentials.
  Passwords and usernames are write-only and are never returned by the tools.
- **Account and billing:** Identify the connected user or team and read account
  balance/hourly spend. Retrieve Pod, Serverless, and network-volume billing by
  resource and time range. Billing amounts are in USD.

## Compatibility limitations

The current REST API has no Pod `reset` action, spot/interruptible Pod create
field, or template `readme` field. Existing input fields remain declared, but
unsupported calls return an actionable error. GPU billing filters and custom
billing grouping are likewise unsupported; billing groups by resource ID.

The API resolves endpoint templates at creation and does not retain the source
template ID. Endpoint reads therefore return `templateId: null`; creation
returns the requested source template ID. Existing include-template and
include-endpoint-bound-template options remain compatible because v2 returns
resolved configuration and all owned templates directly.

Paginated Pod, endpoint, and owned-template lists follow provider cursors.
Worker details come from the provider's complete active-worker snapshot.
Pod filters apply to the complete fetched account list because v2 no longer
provides the v1 filter query parameters. The public template catalog is a
provider-curated, capped list rather than a complete search of all templates.

## Official references

- [REST v2 overview](https://docs.runpod.io/api-reference-v2/overview)
- [REST v1 migration](https://docs.runpod.io/api-reference-v2/migrate-from-v1)
- [REST v2 OpenAPI](https://api.runpod.io/v2/openapi.json)
- [Serverless requests](https://docs.runpod.io/serverless/endpoints/send-requests)
- [Serverless operation reference](https://docs.runpod.io/serverless/endpoints/operation-reference)
- [GraphQL schema](https://graphql-spec.runpod.io/)
