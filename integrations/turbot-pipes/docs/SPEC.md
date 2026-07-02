Let me look at the OpenAPI spec to understand the full API capabilities and check for webhook/event support.Now I have enough information to write the specification.

# Slates Specification for Turbot Pipes

## Overview

Turbot Pipes is a cloud intelligence, automation, and security platform for DevOps, built on Steampipe, Powerpipe, and Flowpipe. It provides hosted Steampipe database instances (exposing cloud APIs as SQL-queryable Postgres databases), dashboards and compliance benchmarks via Powerpipe, and workflow automation via Flowpipe. Users can manage workspaces, connections to cloud providers, organizations, and run queries, pipelines, and scheduled tasks through a REST API.

## Authentication

Turbot Pipes uses **API token-based authentication** (Bearer tokens) for its REST API.

To use the Turbot Pipes API, you must connect with an API token. Tokens are passed via the `Authorization` header:

```
Authorization: Bearer tpt_c6rnjt8afakemj4gha10_svpnmxqfaketokenad431k
```

**Generating tokens:**

You can manage your API tokens, rotate your database password, and reset authentication for your developer account from the Advanced tab, under Credentials & Access. You can create non-expiring API tokens for your user account. You can have up to 2 tokens at a time.

**Token format:** Tokens are prefixed with `tpt_` (e.g., `tpt_c6rnjt8afakemj4gha10_svpnmxqfaketokenad431k`). They can also be set via the `PIPES_TOKEN` environment variable.

**Base URL:** `https://pipes.turbot.com/api/latest/` (or `https://pipes.turbot.com/api/v0/`)

For Enterprise tenants with custom domains (e.g., `acme.pipes.turbot.com`), the base URL will reflect the tenant domain.

**Note:** The token will be masked, but you can reveal it by clicking the eye icon. Make a secure note of the token, as you will not be able to retrieve it again.

## Features

### Workspace Management

A workspace provides a secure, independent set of Pipes resources. Workspaces allow you to separate your Steampipe instances for security, operational, or organizational purposes. Each workspace includes a dedicated Steampipe database instance hosted in Turbot Pipes and available via a public Postgres endpoint. You can query the workspace database from the Turbot Pipes web console, run queries or controls from a remote Powerpipe or Steampipe CLI instance, or connect to your workspace from many third-party tools.

- Create, update, and delete workspaces.
- Configure instance types, database volume size, and desired state.
- Workspaces also include a hosted Powerpipe server for benchmarks and dashboards, and a hosted Flowpipe server for running pipelines and always-on triggers.

### SQL Query API

The Turbot Pipes API makes it easy to query your data and integrate it into your scripts and applications!

- Execute SQL queries against workspace Steampipe databases via the REST API.
- By default, the results are in JSON. You can get the results in other formats by adding a file name with the appropriate extension to the path. Supported formats include JSON, CSV, and others via content type headers.

### Connection Management

Connections provide the credentials, scope, and configuration information for interacting with an external system. For example, you may create AWS connections and add them as schemas to Steampipe so that you can query your AWS configuration. Flowpipe pipelines can also use these connections, allowing you to perform remediation actions on those same accounts.

- Create, update, delete, and list connections and connection folders.
- Connections and connection folders may be created at any level of the hierarchy: tenant-level, organization-level, or workspace-level, with different sharing capabilities.
- Manage permissions on connections and connection folders.

### Integrations

Integrations often manage other Pipes resources, such as mods and connections. Where a single connection only represents a single security principal, integrations may provide credentials for multiple purposes, requesting different scopes in different situations or impersonating other principals / assuming multiple roles.

- Supported integration types include AWS, Azure, GCP, GitHub, GitLab, and Slack.
- The AWS, Azure, and GCP integrations can be configured to automatically import a connection folder hierarchy that mirrors your organization structure. The integration will automatically keep the configuration up to date as your organization changes.

### Organization and Tenant Management

- Create and manage organizations, including members, roles, and invitations.
- Organizations allow you to collaborate and share workspaces and connections with your team.
- With Pipes Enterprise, you can create your own isolated tenant with a custom domain. Your tenant has its own discrete set of user accounts, organizations, and workspaces, giving you centralized visibility and control. You can choose which authentication methods are allowed, configure which domains to trust, and set up SAML.

### Snapshots

Turbot Pipes allows you to save and share dashboard snapshots, either internally with your team or publicly with a sharing URL. You can even schedule snapshots and be notified when complete.

- List, retrieve, and manage snapshots for workspaces.
- Schedule snapshots on recurring intervals.

### Datatank

Datatank allows you to accelerate queries to Steampipe by periodically fetching data and storing it in a persistent database table.

- Create and manage datatanks and datatank tables within workspaces.
- Configure refresh intervals or schedules for tables.
- Choose between "all at once" and "per connection" update methods.
- Only available on persistent workspace instance types.

### Flowpipe Pipelines and Triggers

- Manage Flowpipe mods, pipelines, triggers, and executions within workspaces.
- A trigger runs a pipeline when an event occurs, via a webhook, query, or schedule.
- View pipeline execution history and status.

### Notifiers

Notifiers allow you to define a list of integrations to which to send notifications. Each notifier contains a list of integrations and related settings used to send and receive data to one or more integrations.

- Create and manage notifiers at the tenant, organization, or workspace level.
- Route notifications to Slack, email, or Microsoft Teams.

### User and Identity Management

- Manage user profiles, avatars, and developer account settings.
- Manage organization and workspace membership and roles.
- View usage metrics and billing information.

### Activity and Process Monitoring

Many Turbot Pipes APIs perform tasks asynchronously. These tasks include Steampipe and Powerpipe scheduled snapshots, Flowpipe trigger and pipeline executions, one-time requests, and recurring system tasks. Processes provide visibility into these activities.

- List and view processes and their statuses.
- Filter processes using query filter syntax.

## Events

The provider does not support webhooks or event subscription mechanisms for external consumers. Turbot Pipes can send outgoing notifications (e.g., to Slack or Microsoft Teams) when scheduled snapshots complete, but it does not expose a webhook or event subscription API for external systems to subscribe to changes within Pipes itself.
