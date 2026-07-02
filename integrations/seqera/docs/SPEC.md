Now let me look at the API reference to understand the full feature set:Now I have enough information to write the specification.

# Slates Specification for Seqera

## Overview

Seqera Platform is the centralized command post for the management of Nextflow data pipelines. It offers monitoring, logging, and observability for distributed workflows and simplifies the deployment of pipelines on any cloud, cluster, or laptop. The Seqera Platform services API is a programmatic interface for all operations available in the Platform web UI.

## Authentication

Seqera Platform uses **Bearer Token** authentication via personal access tokens.

- The API requires an authentication token to be specified in each API request using the Bearer HTTP header.
- Select "User tokens" from the user menu in the Seqera UI, then select "Add token" to create a new token.
- The token is only displayed once when it is created.

The token is passed via the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

- The API can be accessed from `https://api.cloud.seqera.io`. For self-hosted Enterprise deployments, a custom API endpoint URL is used instead.
- Most API operations are scoped to a **workspace**. You can find your workspace ID from the Workspaces tab on your organization page. The workspace ID is typically passed as a `workspaceId` query parameter.

## Features

### Pipeline Management

A pipeline consists of a pre-configured workflow repository, compute environment, and launch parameters. The API allows you to create, list, update, and delete pipelines within a workspace. You can list configured pipelines in a workspace and add new pipelines.

### Workflow Runs (Launching & Monitoring)

You can list all workflow runs in a workspace with status, duration, and metadata, and get detailed information about a specific workflow run including status, logs, and outputs. You can launch a new workflow run with specified parameters, compute environment, and configuration. You can also cancel a running workflow. Run details include task-level status, resource metrics (CPU, memory, wall time, costs), and execution metadata.

### Compute Environments

Compute environments define the execution platform where a pipeline or Studio will run. They enable users to launch pipelines and studios on a growing number of cloud and on-premises platforms. You can create compute environments for AWS Batch, Google Cloud, Azure, Kubernetes, etc. The API supports listing, creating, updating, and deleting compute environments.

### Datasets

A dataset is a collection of versioned, structured data (usually in the form of a samplesheet) in CSV or TSV format. A dataset is used as the input for a pipeline run. You can list datasets available in a workspace and create new datasets from CSV/TSV files.

### Credentials

Credentials are access keys stored by Seqera in an encrypted format, using AES-256 encryption. They allow the safe storage of authentication keys for compute environments, private code repositories, and external services. The API allows managing credentials within workspaces.

### Secrets

Pipeline secrets are keys used by workflow tasks to interact with external systems, such as a password to connect to an external database or an API token. Pipeline secrets defined in a workspace are available to the workflows launched within that workspace. Pipeline secrets defined by a user are available to the workflows launched by that user in any workspace.

### Organizations, Workspaces & Teams

An organization is the top-level entity where businesses, institutions, and groups can collaborate. It can contain multiple workspaces. A workspace provides the context in which a user operates, including what resources are available and who can access them. It's composed of pipelines, compute environments, credentials, runs, actions, and datasets. Access permissions are controlled through participants, collaborators, and teams. The API allows managing organizations, workspaces, members, teams, and participant roles.

### Actions (Pipeline Automation)

Actions enable event-based pipeline execution, such as triggering a pipeline launch with a GitHub webhook whenever the pipeline repository is updated. Seqera Platform currently offers support for native GitHub webhooks and a general Tower webhook that can be invoked programmatically. The API supports creating and managing these action configurations.

### Studios (Interactive Analysis)

Studios enable cloud-based, interactive development, giving seamless access to data, tools, and compute. Studios support environments like Jupyter Notebooks, RStudio, and VS Code. The API allows creating, starting, stopping, and managing Studio sessions within workspaces.

### Data Explorer

You can browse and manage datasets across any cloud storage provider or on-prem system from a single interface, with seamless pipeline integration. The Data Explorer API provides access to cloud storage buckets and data links associated with workspace credentials.

### Access Tokens

The Tokens API allows managing Seqera Platform API access tokens. You can list, create, and delete personal access tokens programmatically.

### Resource Labels

Resource labels allow tagging pipelines, runs, and compute environments for cost tracking and organizational purposes across teams and workspaces.

## Events

Seqera Platform supports inbound webhook-based triggers for pipeline automation, but does not provide outbound webhooks or event subscriptions for listening to platform events (e.g., workflow completion notifications).

### Inbound Webhooks (Pipeline Actions)

- **GitHub Webhook**: A GitHub webhook listens for any changes made in the pipeline repository. When a change occurs it triggers the launch of the pipeline automatically. Requires GitHub authentication in Seqera.
- **Tower Launch Hook**: A Tower launch hook creates a custom endpoint URL which can be used to trigger the execution of your pipeline programmatically from a script or web service. This generates a unique URL that can be called by any external system to launch a pre-configured pipeline.

Note: Seqera does not provide outbound webhooks or event subscription mechanisms to notify external systems when events occur within the platform (such as pipeline completion or failure). Email notifications exist but are limited to the platform UI configuration.
