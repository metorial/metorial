# Slates Specification for dbt Cloud

## Overview

dbt Cloud is a managed platform for dbt (data build tool) that enables data teams to transform data in their warehouse using SQL. It provides job scheduling, CI/CD, an integrated development environment, project metadata and discovery APIs, and a semantic layer for defining and querying business metrics. The platform exposes Administrative, Discovery, and Semantic Layer APIs for programmatic access.

This Slates integration focuses on the current Administrative API routes that are practical for agent workflows: account discovery and inspection, project and environment discovery, job discovery and triggering, run monitoring/cancel/retry flows, artifact listing and download, user listing, and webhook subscription management. Discovery API and Semantic Layer GraphQL endpoints are separate dbt APIs with endpoint URLs and token permissions that vary by account and are not exposed as tools in this package.

## Authentication

dbt Cloud supports two types of token-based authentication:

### Personal Access Tokens (PATs)

Each dbt user with a Developer license can create a personal access token (PAT) to access the dbt API and dbt CLI. This token can execute queries against the dbt API on the user's behalf.

- PATs inherit the permissions of the user that created them. For example, if a developer-licensed user with Project Admin role access to specific projects creates a PAT, the token will get the Project Admin role with access to the same projects as the user.
- These tokens are also account-specific, so if a user has access to more than one dbt account with the same email address, they need to create a unique PAT for each one of these accounts.
- Created under **Account Settings → API Tokens → Personal Tokens**.

### Service Account Tokens

Service account tokens belong to an account rather than a user. You can use service account tokens for system-level integrations that do not run on behalf of any one user.

- Assign any permission sets available in dbt to your service account token, which can vary slightly depending on your plan.
- You can assign service account tokens to any permission set available in dbt. When you assign a permission set to a token, you will also be able to choose whether to grant those permissions to all projects in the account or to specific projects.
- Available permission sets include: Account Admin, Member, Job Admin, Read-Only, Metadata, Semantic Layer, and others depending on plan tier.
- Created under **Account Settings → Service Tokens**.

### Making API Requests

Include the token in the Authorization header of your API requests. For example: `Authorization: Bearer <your-token>`.

The base URL depends on your region and deployment type (e.g., `https://cloud.getdbt.com` for US multi-tenant, `https://emea.dbt.com` for EMEA). Single-tenant deployments have custom hostnames. Account-scoped API requests require an `account_id` path parameter. The integration keeps `accountId` optional: tools use a configured or per-call `accountId` when provided, single-account tokens can omit it, and multi-account tokens should call **List Accounts** before passing the selected account ID to account-scoped tools.

## Features

### Account and Project Management

The dbt Cloud API can perform CRUD operations on multiple endpoints for Connections, Environments, Jobs, Licenses, Users, Notifications, Permissions, Projects, Repositories, and more. This allows managing the full dbt Cloud account configuration programmatically, including creating projects, configuring environments, managing users and groups, and setting up repository connections.

### Job Orchestration

Discover, trigger, retry, and monitor dbt jobs through the API. When triggering a job run, you can override parameters such as dbt version, number of threads, target name, timeout, whether to generate docs, pull request identifiers, and the list of steps to execute. You can also cancel queued or running jobs and retrieve detailed run status, failure details, and history.

### Run Artifacts

Fetch artifacts from a completed run. Once a run has been completed, you can download the `manifest.json`, `run_results.json`, or `catalog.json` files from dbt Cloud. These artifacts contain information about the models in your dbt project, timing information around their execution, and a status message indicating the result of the model build.

### Discovery API (Metadata)

The dbt Discovery API can be used to fetch metadata related to the state and health of your dbt project. This is a GraphQL API that allows querying:

- At the environment level for both the latest state and historical run results of a dbt project in production. At the job level for results on a specific dbt job run for a given resource type, like models or tests.
- The metadata includes details about your project's models, sources, and other nodes along with their execution results. With the Discovery API, you can query this comprehensive information to gain a better understanding of your DAG and the data it produces.

Use cases include performance monitoring, data quality checks, lineage exploration, and governance.

### Semantic Layer

The Semantic Layer allows you to define metrics in code (with MetricFlow) and dynamically generate and query datasets in downstream tools based on their dbt governed assets, such as metrics and models. Use GraphQL to query metrics and dimensions in downstream tools. Use a JDBC driver to query metrics and dimensions in downstream tools, while also providing standard metadata functionality. Use the Python SDK to interact with the dbt Semantic Layer using Python.

- Requires a service token with the Semantic Layer permission set.

### Webhook Management

Webhook subscriptions can be created, updated, listed, and deleted via the API. dbt Cloud webhooks are also accessible programmatically through an API endpoint to create, edit, or delete webhook subscriptions programmatically.

## Events

dbt Cloud supports outbound webhooks for job run events. With dbt, you can create outbound webhooks to send events (notifications) about your dbt jobs to your other systems.

### Job Run Events

The available event types are:

- **`job.run.started`** — Triggered when a dbt job run begins execution.
- **`job.run.completed`** — Triggered when a dbt job run finishes successfully. Note: failed runs may also trigger this event depending on configuration.
- **`job.run.errored`** — Triggered when a dbt job run encounters an error and fails.

**Configuration options:**

- Events — Choose the event you want to trigger this webhook. You can subscribe to more than one event.
- Jobs — Specify the job(s) you want the webhook to trigger on. Or, you can leave this field empty for the webhook to trigger on all jobs in your account. By default, dbt configures your webhook at the account level.
- dbt provides a secret token (HMAC) that you can use to check for the authenticity of a webhook.
