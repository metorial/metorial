# Slates Specification for Databricks

## Overview

Databricks is a unified data analytics and AI platform built on Apache Spark, available on AWS, Azure, and GCP. It provides workspaces for managing clusters, running notebooks, orchestrating data pipelines, training ML models, and querying data via SQL warehouses. The platform offers REST APIs at both the account level (for administration) and the workspace level (for interacting with resources).

## Authentication

Databricks supports multiple authentication methods. There are two types of APIs requiring different authentication: account-level APIs (hosted on the account console URL) and workspace-level APIs (hosted at workspace URLs).

### Personal Access Tokens (PATs) — Legacy

Personal access tokens (PATs) let you authenticate to resources and APIs at the workspace level. To use a PAT, pass it as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-pat>
```

Required inputs:

- **Host**: Your Databricks workspace URL (e.g., `https://adb-1234567890123456.7.azuredatabricks.net`)
- **Token**: The personal access token string

Tokens can be scoped to limit permissions to specific API operations.

### OAuth 2.0 User-to-Machine (U2M)

Databricks uses OAuth 2.0 as the preferred protocol for user authorization and authentication outside of the UI. This uses the authorization code flow with PKCE.

Key endpoints:

- **Authorization**: `https://<databricks-instance>/oidc/v1/authorize`
- **Token**: `https://<databricks-instance>/oidc/v1/token`

After a user signs in and grants consent, OAuth issues an access token for the tool to use on the user's behalf. Each access token is valid for one hour, after which a new token is automatically requested.

Available scopes include `all-apis`, `sql`, `file.files`, `dashboards.genie`, among others.

### OAuth 2.0 Machine-to-Machine (M2M)

Machine-to-machine (M2M) authentication with OAuth allows services, scripts, or applications to access Databricks resources without interactive user sign-in. It uses a service principal and an OAuth client credential flow to request and manage tokens.

Required inputs:

- **Host**: Workspace URL or account console URL
- **Client ID**: The service principal's client ID
- **Client Secret**: The service principal's OAuth secret
- **Account ID** (for account-level operations only)

To generate an OAuth M2M access token, use the service principal's client ID and OAuth secret. Each access token is valid for one hour. After it expires, request a new token.

Token endpoint for workspace-level: `https://<workspace-url>/oidc/v1/token`
Token endpoint for account-level: `https://accounts.cloud.databricks.com/oidc/v1/token` (AWS), `https://accounts.azuredatabricks.net/oidc/v1/token` (Azure)

Grant type: `client_credentials`

### Azure-Specific: Microsoft Entra ID Service Principal

For Azure Databricks only. Microsoft Entra service principal authentication uses the credentials of a Microsoft Entra service principal. Databricks recommends using OAuth M2M in most scenarios. OAuth M2M uses OAuth access tokens that are more robust when authenticating only with Azure Databricks. Only use Microsoft Entra service principal authentication when you must authenticate with Azure Databricks and other Azure resources at the same time.

Required inputs:

- **Host**: Workspace URL
- **Azure Tenant ID**
- **Azure Client ID**
- **Azure Client Secret**

## Features

### Cluster Management

Create, start, stop, resize, terminate, and configure Apache Spark clusters. Clusters can be configured with autoscaling, specific Spark versions, node types, and instance pools. Supports both all-purpose (interactive) and job clusters.

### Job Orchestration

Create, edit, and delete jobs. Jobs support multiple task types including notebooks, Python scripts, JARs, Spark submit, SQL, and dbt. Jobs can be scheduled on a cron basis, triggered by file arrival, table updates, or run on demand. Multi-task workflows with dependencies are supported.

### Notebook and Workspace Management

List, import, export, and delete notebooks and folders. Supports multiple languages (Python, Scala, SQL, R). Notebooks can be imported/exported in various formats (SOURCE, HTML, JUPYTER, DBC).

### SQL Warehouses and Query Execution

A SQL warehouse is a compute resource that lets you run SQL commands on data objects within Databricks SQL. You can create and manage SQL warehouses, execute SQL statements, and manage queries and dashboards.

### Unity Catalog (Data Governance)

Manage catalogs, schemas, tables, volumes, functions, and external locations. Unity Catalog provides a standards-compliant security model based on ANSI SQL, automatically captures user-level audit logs, tracks lineage data across all languages, and lets you tag and document data assets with a search interface for data discovery.

### Delta Live Tables (Pipelines)

Create and manage declarative data pipelines using Delta Live Tables. Pipelines support continuous or triggered execution modes, and define data transformations as a directed acyclic graph.

### MLflow and Model Registry

Track ML experiments, log runs, manage registered models and model versions. The Workspace Model Registry API is available, and Databricks also provides a hosted version of MLflow Model Registry in Unity Catalog.

### Model Serving

Define model serving endpoints to deploy ML models and foundation models as REST APIs. Foundation Model APIs are designed to be similar to OpenAI's REST API to make migrating existing projects easier. Supports pay-per-token and provisioned throughput endpoints.

### Vector Search

Create and manage vector search endpoints (compute resources to host vector search indexes) and vector search indexes for efficient approximate nearest neighbor (ANN) search queries.

### Secret Management

Securely store credentials and reference them in notebooks and jobs using Databricks secrets. Secrets are organized in scopes with access control lists. On Azure, scopes can be backed by Azure Key Vault.

### Identity and Access Management

Manage users, groups, and service principals at both account and workspace levels. Assign permissions on clusters, jobs, notebooks, and other workspace objects. Supports SCIM-based identity provisioning.

### DBFS (Databricks File System)

Upload, download, list, and delete files in the Databricks File System. Unity Catalog Volumes provide a newer, governed alternative for file management.

### Delta Sharing

Share data across organizations securely using the open Delta Sharing protocol. Manage shares, recipients, and providers.

### Lakeview Dashboards

Provide management operations for Lakeview dashboards. Create, update, publish, and embed dashboards.

### Libraries

Install and uninstall libraries and get the status of libraries on a cluster.

## Events

### Workspace Model Registry Webhooks

Webhooks enable you to listen for Workspace Model Registry events so your integrations can automatically trigger actions. You can use webhooks to automate and integrate your machine learning pipeline with existing CI/CD tools and workflows. For example, you can trigger CI builds when a new model version is created or notify your team members through Slack each time a model transition to production is requested.

Supported events include:

- MODEL_VERSION_CREATED: A new model version was created for the associated model.
- REGISTERED_MODEL_CREATED: A new registered model was created.
- MODEL_VERSION_TAG_SET, MODEL_VERSION_TRANSITIONED_TO_STAGING, MODEL_VERSION_TRANSITIONED_TO_PRODUCTION, and MODEL_VERSION_TRANSITIONED_TO_ARCHIVED.
- TRANSITION_REQUEST_TO_STAGING_CREATED, TRANSITION_REQUEST_TO_PRODUCTION_CREATED, and TRANSITION_REQUEST_TO_ARCHIVED_CREATED.

Webhooks can be configured as:

- HTTP registry webhooks that send triggers to an HTTP endpoint.
- Job registry webhooks that trigger a job in a Databricks workspace.

Scope options:

- Model-specific webhooks apply to a specific registered model (requires CAN MANAGE permissions).
- Registry-wide webhooks are triggered by events on any registered model in the workspace. You create them by omitting the model_name field, and they require workspace admin permissions.

Webhooks are not available when you use Models in Unity Catalog.

### Job Notification Webhooks

Jobs support webhook-based notification destinations that fire on job lifecycle events (start, success, failure). By default, notifications are sent to user email addresses, but admins can configure alternate notification destinations using webhooks, allowing you to build event-driven integrations with Databricks. Notification destinations are currently limited to Databricks SQL alerts and jobs.
