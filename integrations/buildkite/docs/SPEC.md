Now let me get the specific list of webhook events for pipelines:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Buildkite

## Overview

Buildkite is a CI/CD platform that allows teams to run build pipelines on their own infrastructure while managing orchestration through a hosted service. It provides three core products: Pipelines (CI/CD), Test Engine (test analytics), and Package Registries (artifact management).

## Authentication

### API Access Tokens (Primary Method)

Buildkite API authenticates using access tokens, which can be created from the API access tokens page in your Personal Settings. Basic HTTP authentication is not supported.

To authenticate, set the `Authorization` header to `Bearer $TOKEN`:

```
Authorization: Bearer $TOKEN
```

Base URL: `https://api.buildkite.com/v2/`

API access tokens are issued to individual Buildkite user accounts, not Buildkite organizations. When configuring API access tokens, you can limit their access to individual organizations and permissions, and these tokens can be revoked at any time.

**Scopes:** Tokens are configured with REST API Scopes, where you select permissions (READ, WRITE, DELETE) for different Buildkite platform features. Each combination of permission and feature is known as a scope. You can also select "Enable GraphQL API access" as an additional scope, which is a full-access option without further granular restrictions.

**Additional token options:**

- Configurable token expiry duration.
- IP address restrictions using CIDR notation.
- Organization-level access restriction (tokens are scoped to specific organizations).

### JWT Authentication (Preview)

API access tokens can be created with a public key pair instead of a static token. The private key can be used to sign JWTs to authenticate API calls. You must use the API access token's UUID as the `iss` claim in the JWT, have an `iat` within 10 seconds of the current time, and an `exp` within 5 minutes of your `iat`.

## Features

### Pipeline Management

Create, update, delete, archive, and unarchive CI/CD pipelines within an organization. Pipelines define the build steps that run when code is pushed. Supports configuring repository connections, build steps, environment variables, branch filtering, tags, and team assignments. Pipelines can be organized into clusters for security isolation. Pipeline templates allow standardizing pipeline configurations across an organization.

### Build Management

Trigger, list, cancel, and rebuild builds for pipelines. A build is a single run of a pipeline. You can trigger a build via the dashboard, API, webhook, schedule, or from another pipeline using a trigger step. Builds can be filtered by state (running, scheduled, passed, failed, blocked, canceled, etc.), branch, commit, creator, and creation date. Supports setting environment variables, commit SHA, branch, message, and metadata when creating builds.

### Job Management

Inspect and manage the individual jobs (steps) within builds. Jobs can be retried, canceled, unblocked (for block steps), and their logs and environment details can be retrieved. Job output logs can be fetched for debugging purposes.

### Agent Management

List and inspect connected agents running builds on your infrastructure. Agents can be stopped, paused, and resumed via the API. Only connected agents are returned in listings.

### Cluster and Queue Management

Create and manage clusters to isolate groups of agents and pipelines. Within clusters, manage agent queues for routing jobs to specific agents. Create, update, and revoke agent tokens that agents use to connect to clusters. Manage cluster maintainers and Buildkite secrets.

### Organization and Team Management

List organizations and their members. Create and manage teams with configurable member roles and pipeline access levels. Assign pipelines, test suites, and registries to teams. Invite and manage organization members.

### Build Artifacts and Annotations

List, download, and manage build artifacts (files produced during builds). Create and manage build annotations to display additional context on build pages (supports Markdown/HTML).

### Test Engine

Manage test suites, view test runs, identify and quarantine flaky tests. Query test results and analytics data across builds.

### Package Registries

Create and manage package registries supporting multiple ecosystems (npm, Maven, Docker/OCI, Python, Ruby, Helm, etc.). Publish, list, and manage packages. Manage registry tokens for authentication.

### GraphQL API

Buildkite also provides a GraphQL API that allows for more efficient retrieval of data by enabling you to fetch multiple, nested resources in a single request. The GraphQL API endpoint is `https://graphql.buildkite.com/v1`. Some tasks can only be achieved using the GraphQL API or the REST API. The REST API is a good choice for organization-level tasks with granular access permissions, while GraphQL is more comprehensive for complex data queries.

### Rules

Create and manage rules that control access policies between pipelines and clusters, enabling fine-grained security controls.

## Events

Buildkite provides webhook support for Pipelines, Test Engine, and Package Registries. Webhooks are configured per organization or per registry, and deliver JSON payloads via HTTP POST to your specified URL endpoint. Each webhook includes an `X-Buildkite-Token` header or an `X-Buildkite-Signature` (HMAC-SHA256) header for verifying authenticity.

### Build Events

Notifications when builds change state. Available events: `build.scheduled`, `build.running`, `build.failing`, `build.finished`, `build.skipped`.

- Webhooks can be filtered to specific pipelines, teams, clusters, and branches.
- Build payloads do not include job data; use job events for that.

### Job Events

Notifications when individual jobs within builds change state. Available events: `job.scheduled`, `job.started`, `job.finished`, `job.activated` (block step unblocked).

- Same filtering options as build events (pipeline, team, cluster, branch).

### Agent Events

Notifications about agent lifecycle changes. Available events: `agent.connected`, `agent.lost`, `agent.disconnected`, `agent.stopping`, `agent.stopped`, `agent.blocked`.

- Useful for automating infrastructure scaling and monitoring agent health.

### Agent Token Events

`cluster_token.registration_blocked` fires when an agent registration attempt is blocked due to IP address restrictions on the agent token.

### Ping Events

`ping` fires when webhook notification settings are changed, useful for verifying webhook connectivity.

### Test Engine Events

Buildkite Test Engine supports webhook events relating to a monitor on a test suite's workflow triggering an alarm or recover action.

### Package Registry Events

You can configure webhooks to be triggered in Package Registries when a package, image, chart, model, module, or file is created. The event is `package.created`.
