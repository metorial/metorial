Now let me get more details on the webhook event types and the full REST API feature set:Now I have enough information to write the specification.

# Slates Specification for Pulumi

## Overview

Pulumi Cloud is an infrastructure-as-code platform that provides state management, secrets management, and deployment orchestration for cloud infrastructure. Its REST API allows programmatic management of organizations, projects, stacks, environments, deployments, policies, and team access. The API base URL is `https://api.pulumi.com` for the managed service, or a custom URL for self-hosted instances.

## Authentication

Pulumi Cloud uses **Access Token** authentication for its REST API. There are three types of access tokens:

- **Personal Access Tokens (PATs):** Scoped to an individual user's permissions. Available to all Pulumi Cloud users. Can be created at `https://app.pulumi.com/account/tokens`.
- **Organization Access Tokens:** Scoped to organization-level permissions (member or admin). Available to Enterprise and Business Critical editions only.
- **Team Access Tokens:** Scoped to the permissions of a specific team. Available to Enterprise and Business Critical editions only.

All requests must be authenticated using a token via the `Authorization` HTTP header. The header must be in the form `Authorization: token {token}` where `{token}` is your access token value. Tokens can be viewed, created, or revoked on the Access Tokens page.

The following headers are required for all operations: `Accept: application/vnd.pulumi+8` and `Content-Type: application/json`.

Tokens can optionally be configured with an expiration period of up to two years, or set to never expire.

Example request:

```
curl -H "Accept: application/vnd.pulumi+8" \
     -H "Content-Type: application/json" \
     -H "Authorization: token pul-abc123..." \
     https://api.pulumi.com/api/user/stacks
```

## Features

### Organization Management

Manage Pulumi Cloud organizations including viewing organization details and managing membership. Organizations serve as the top-level container for projects, stacks, teams, and policies.

### Stack Management

Manage projects and stacks, including creating, listing, and deleting stacks. View stack outputs, configuration, tags, and update history. Stacks are the core deployment unit representing an instance of a Pulumi program.

- Stacks are organized under projects within organizations.
- Stack tags can be applied for categorization and querying.
- Stack configuration (including environment bindings and secrets provider) can be managed via the API.

### Deployments

Configure and manage Pulumi Deployments, which enable you to execute Pulumi updates and other operations through Pulumi Cloud. Trigger operations like `update`, `preview`, `destroy`, and `refresh` remotely.

- Configure deployment settings per stack (source context, operation context, GitHub integration).
- View deployment status, logs, and history.
- Pause, resume, and cancel in-progress deployments.
- Manage customer-managed deployment runners.

### Stack Updates

Stack updates are operations that create, update, or delete resources in a Pulumi stack. The Stack Updates API allows you to list updates, check status, and view detailed events for each operation.

- View resource changes, policy checks, and detailed events for each update.

### Environments (Pulumi ESC)

Access, share, and manage secrets, passwords, API keys, and configuration. Environments support importing one into another for composability and inheritance. Every change is versioned, enabling easy rollback.

- Create, read, update, and delete ESC environments.
- Open environments to resolve and retrieve computed values and secrets.

### Services

Services are a way to group and organize related resources in Pulumi Cloud. The Services API allows you to create, manage, and organize collections of resources that work together to provide a specific capability.

- Add and remove stacks and environments as items in a service.

### Policy Management

Apply and enforce compliance policies across your infrastructure. Manage policy packs (collections of rules) and policy groups (bindings of packs to stacks).

- View policy violation results for stack updates.

### Resource Search

Query and search resources under management. Search across all cloud resources managed by Pulumi in your organization, filtering by resource type, properties, and other metadata. Useful for auditing and incident response.

### Audit Logs

Audit logs enable you to track the activity of users within an organization. They display what a user did, when they did it and where by recording user actions. The logs are immutable and record all user actions.

- Export in JSON, CSV, or CEF format for SIEM integration.
- Available to organizations using the Enterprise and Business Critical editions.

### Access Token Management

Personal Access Tokens (PATs) are credentials that can be used to authenticate with the Pulumi Cloud API. The Personal Access Tokens API allows you to manage these tokens programmatically.

- List, create, and delete tokens.

### Schedules

Configure scheduled operations for stacks such as recurring drift detection, updates, or TTL (time-to-live) stack destruction.

### AI Agent (Neo)

The Agent Tasks API allows you to create and manage AI agent tasks in Pulumi Cloud. These endpoints enable you to create tasks, monitor their status, respond to agent requests, and retrieve task events.

- These endpoints are currently in preview status. The API may change before general availability.

### Data Export

Export data from Pulumi Cloud for external analysis and reporting.

### Registry

Access and publish packages to the Pulumi Registry.

## Events

Pulumi Cloud supports webhooks that notify external services of events occurring within your organization or specific stacks/environments.

### Stack Events

Events related to stack lifecycle operations. Can be scoped to organization-wide or individual stack webhooks.

- **Stack created/deleted** — Triggered when a stack is created or deleted (organization webhooks only).
- **Preview succeeded/failed** — Triggered when a stack preview operation completes.
- **Update succeeded/failed** — Triggered when a stack update operation completes.
- **Destroy succeeded/failed** — Triggered when a stack destroy operation completes.
- **Refresh succeeded/failed** — Triggered when a stack refresh operation completes.

### Deployment Events

Events related to Pulumi Deployments execution.

- **Deployment queued/started/succeeded/failed** — Triggered at various stages of a deployment lifecycle.

### Drift Detection & Remediation Events

Events related to drift detection and remediation runs.

- **Drift detected** — Triggered when infrastructure drift is found.
- **Drift detection succeeded/failed** — Triggered when a drift detection run completes.
- **Drift remediation succeeded/failed** — Triggered when a drift remediation run completes.

### Policy Violation Events

Events related to policy compliance checks.

- **Mandatory policy violation** — Triggered when a mandatory policy is violated.
- **Advisory policy violation** — Triggered when an advisory policy is violated.

### Environment Events (ESC)

ESC Webhooks allow you to notify external services of events happening within your ESC environments. For example, you can trigger a notification whenever a new revision of an environment is created.

- **Environment revision created** — Triggered when a new version of an environment is saved.
- **Imported environment changed** — Triggered when an imported (parent) environment changes.

### Webhook Configuration Options

- Webhooks can target generic JSON endpoints, Slack, Microsoft Teams, or trigger Pulumi Deployments directly.
- Event filtering is available using groups (e.g., `stacks`, `deployments`) or individual event filters.
- An optional shared secret can be provided for HMAC signature verification of payloads.
- Webhooks do not guarantee ordered delivery of events.
