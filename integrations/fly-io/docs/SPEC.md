# Slates Specification for Fly.io

## Overview

Fly.io is a cloud platform that runs applications on fast-launching Firecracker microVMs in data centers around the world. It provides a REST API (Machines API) and a GraphQL API for provisioning and managing applications, virtual machines, persistent storage volumes, and networking. Users can deploy containerized workloads to specific geographic regions with fine-grained control over VM lifecycle, resources, and placement.

## Authentication

Fly.io uses **Bearer token authentication**. All API requests must include an access token in the HTTP header:

```
Authorization: Bearer <fly_api_token>
```

Fly.io access tokens use macaroons, which come with predefined scopes to reduce access from org-wide all the way down to running a specific command on a single app's Machines.

There are several token types with different scopes:

- **Personal access token (auth token):** The auth token, sometimes called the "personal access token" or the "all-powerful auth token", is a very short-lived token that is automatically created each time you log in with `fly auth login`. This grants full access across all organizations in your account. Not recommended for API integrations.

- **App-scoped deploy token:** Use an app-scoped token, sometimes just called a "deploy token", to limit access to a single app. App-scoped tokens are useful for CI/CD pipelines where you need to share a token with a 3rd party. Created via `fly tokens create deploy`.

- **Org-scoped token:** Use an org-scoped token for access to manage all the apps within a single organization. An org-scoped token is the middle ground between the auth token and the more restricted app-scoped token, and is useful when you want to automate a single org. Created via `fly tokens create org`.

- **Read-only token:** A read-only org-scoped token that allows querying but not making changes. Created via `fly tokens create readonly`.

- **SSH token / Machine-exec token:** Specialized tokens for SSH access or executing commands on Machines for a specific app.

Tokens are valid for 20 years by default. We recommend using a shorter expiry if practical. Custom expiry durations can be set at creation time.

Use the correct scheme based on token type: `Bearer <token>` for `flyctl auth token`, and `FlyV1 <token>` for all tokens created with `fly tokens create`.

**API Base URLs:**

- Internal base URL: `http://_api.internal:4280`. Public base URL: `https://api.machines.dev`.
- GraphQL API: `https://api.fly.io/graphql`

## Features

### App Management

Create, list, retrieve, and delete Fly Apps. A Fly App can be a web app, or a database, or a bunch of task Machines, or whatever you want to deploy. Apps serve as named collections that group Machines, volumes, networking configuration, and secrets. Apps can be segmented into isolated networks.

### Machine Lifecycle Management

You can use the Machines resource to create, stop, start, update, and delete Fly Machines. Fly Machines are fast-launching VMs; they can be started and stopped at subsecond speeds. We give you control of your Machine count and each Machine's lifecycle, resources, and region placement with a simple REST API or flyctl commands.

- Create Machines from container images in specific regions.
- Configure CPU, memory, and GPU resources per Machine.
- Start, stop, restart, and destroy individual Machines.
- Clone existing Machines to scale horizontally.
- Wait for Machines to reach specific states.
- Attach services and configure networking (ports, protocols, proxy behavior).
- Set metadata on Machines and filter by metadata.

### Persistent Storage (Volumes)

Create and manage persistent storage volumes for your Machines. Fly Volumes are local persistent storage for Fly Machines. Every Fly Volume can be attached to one Machine at a time and belongs to one Fly App.

### Secrets Management

Manage sensitive environment variables (secrets) at the app level. Machines inherit secrets from the app. Secrets are exposed as environment variables in VMs.

### SSL/TLS Certificate Management

Manage SSL/TLS certificates for custom domains.

### Networking and IP Allocation

Allocate IP addresses (Anycast IPv4, IPv6) for apps to make them publicly accessible. Configure private networking between Machines within an organization via WireGuard. Currently this is done using flyctl or the Fly.io GraphQL API. This offers your app automatic, global routing via Anycast.

### Metrics and Monitoring

Query Prometheus-compatible metrics for your organization's apps via a dedicated endpoint at `https://api.fly.io/prometheus/<org-slug>/`. Includes built-in metrics for HTTP responses, instance CPU, memory, disk I/O, and network traffic.

### OIDC Token Generation

Request an OpenID Connect token from a 3rd-party via the Tokens resource, enabling Machines to authenticate with external services.

### GraphQL API

The endpoint is `https://api.fly.io/graphql` and provides additional capabilities including organization management, IP address allocation, and querying across apps and their resources. The GraphQL schema is explorable via introspection.

## Events

The provider does not support webhooks or event subscriptions for general users. Receiving machine/application events through webhooks has been requested a few times on the community forum; it's on Fly.io's feature radar. Before they allocate resources towards it, they're trying to gather more information on how it's actually useful for users. Machine event webhooks are only available as part of the Extensions API for registered Fly.io extension providers, not for general API consumers.
