Now let me get the OpenAPI spec to understand the full API surface:Now I have enough information to write the specification. Let me also check for the n8n Trigger node which seems to offer internal event listening:Now I have all the information needed. Let me compile the specification.

# Slates Specification for n8n

## Overview

n8n is a workflow automation platform (available as self-hosted or cloud-hosted) that allows users to connect applications and build automated workflows using a visual node-based editor. It provides a public REST API for programmatic management of workflows, executions, credentials, users, and other instance resources. n8n supports both no-code visual workflow building and code-based extensibility.

## Authentication

n8n's public API uses **API Key authentication**.

**How to obtain an API key:**

1. Log in to your n8n instance.
2. Go to **Settings > n8n API**.
3. Select **Create an API key**.
4. Choose a label and set an expiration time for the key.
5. On enterprise plans, you can optionally select **scopes** to restrict the key's access to specific resources and actions.
6. Copy the generated API key.

**How to use the API key:**

Send the API key as a header named `X-N8N-API-KEY` with every request:

```
X-N8N-API-KEY: <your-api-key>
```

**Base URL:**

- Self-hosted: `<N8N_HOST>:<N8N_PORT>/<N8N_PATH>/api/v1/`
- n8n Cloud: `<your-instance>.app.n8n.cloud/api/v1/`

**Scopes (Enterprise only):**

Users of enterprise instances can limit which resources and actions a key can access with scopes. API key scopes allow you to specify the exact level of access a key needs for its intended purpose. Non-enterprise API keys have full access to all the account's resources and capabilities.

**Availability:**

The n8n API isn't available during the free trial. You need to upgrade to access this feature. The self-hosted version includes full API access at no additional cost, whereas n8n Cloud provides API access only in paid tiers.

## Features

### Workflow Management

Create, retrieve, update, delete, activate, deactivate, and archive workflows programmatically. Workflows are defined as JSON objects containing nodes, connections, and settings. You can also activate a specific historical version of a workflow using an optional `versionId` parameter. Workflows can be filtered by active status and tags.

- Enterprise plans support sharing features and project-based access control for workflows.

### Execution Management

List, retrieve, and delete workflow executions. Executions represent individual runs of a workflow (both manual and production). You can filter executions by workflow, status, and date range. Failed executions can be retried, with an option to use either the original workflow version or the current/latest version.

### Credential Management

Create, retrieve, delete, and list credentials used by workflows to authenticate with external services. The credential schema endpoint returns the JSON schema for a specific credential type, useful for understanding required fields before creating credentials. Credentials can be filtered by name and type.

### User Management

List and retrieve users on the n8n instance. User operations are only available to instance owners.

### Tag Management

Tags help organize workflows and credentials. You can create, retrieve, update, and delete tags via the API.

### Variable Management

Variables store fixed data accessible across workflows (Pro/Enterprise plans). You can create, retrieve, update, and delete variables.

### Project Management

Projects group workflows and credentials for access control (requires appropriate plan). You can create, retrieve, update, and delete projects.

### Source Control

Source control operations require the Source Control feature to be licensed and configured. Allows pulling and pushing workflow changes to and from a connected Git repository.

### Security Audit

Generate security audit reports for your n8n instance. You can select which risk categories to include and configure thresholds such as the number of days a workflow is considered abandoned.

## Events

The n8n public API does not provide webhook subscriptions or an event streaming mechanism for listening to instance-level events (such as workflow status changes or execution completions) from external systems.

However, n8n does have internal trigger nodes that respond to certain instance events within workflows:

- **n8n Trigger node**: Triggers when the workflow containing this node updates or gets published, or when the n8n instance starts or restarts. Events include: Published Workflow Updated, Instance Started, and Workflow Published. This node only responds to events in its own workflow; changes to other workflows won't trigger it.

- **Error Trigger node**: Triggers when any workflow on the instance encounters an error, allowing you to build error-handling/notification workflows.

These are internal workflow mechanisms, not externally subscribable webhooks. There is no external webhook or event subscription API for consuming n8n instance events from outside.
