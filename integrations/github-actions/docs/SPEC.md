Now let me get the full list of GitHub Actions REST API endpoint categories and the OAuth/GitHub App scopes:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for GitHub Actions

## Overview

GitHub Actions is GitHub's built-in CI/CD and workflow automation platform. Its REST API allows programmatic management of workflows, workflow runs, jobs, artifacts, secrets, variables, caches, runners (both GitHub-hosted and self-hosted), and Actions permissions at the repository, organization, and enterprise levels.

## Authentication

GitHub Actions is accessed via the GitHub REST API, which supports the following authentication methods:

### Personal Access Token (PAT)

GitHub recommends using a fine-grained personal access token instead of a personal access token (classic).

- **Fine-grained PAT**: Scoped to specific repositories with granular permissions. For GitHub Actions, relevant permissions include `actions` (read/write for workflows, runs, artifacts, caches), `administration` (for runner management), and `secrets`/`variables` management.
- **Classic PAT**: OAuth tokens and personal access tokens (classic) need the `repo` scope for most Actions endpoints. Organization-level secrets require the `admin:org` scope.

Tokens are passed via the `Authorization` header:

```
Authorization: Bearer <YOUR-TOKEN>
```

### GitHub App (Installation Access Token)

You can generate a token with a GitHub App. You must register a GitHub App, store your app's credentials, and install your app. The app requires at least read-level access for the "Actions" repository permission for most read operations, and write-level access for mutations. An installation access token is generated using the App ID and a private key, and is short-lived (expires after 1 hour).

### GITHUB_TOKEN (Workflow Context Only)

If you want to use the API in a GitHub Actions workflow, GitHub recommends that you authenticate with the built-in GITHUB_TOKEN instead of creating a token. You can grant permissions to the GITHUB_TOKEN with the `permissions` key. However, the GITHUB_TOKEN can only access resources within the workflow's repository. This method is only applicable when calling the API from within a running workflow.

### Base URL

All API requests are made to `https://api.github.com`. The API version header `X-GitHub-Api-Version: 2022-11-28` should be included.

## Features

### Workflow Management

View workflows for a repository. Workflows automate your software development life cycle with a wide range of tools and services. You can list, get, enable, and disable workflows. You can also trigger a workflow run via the `workflow_dispatch` event, passing custom inputs defined in the workflow file. Workflow usage statistics (billable minutes by runner OS) can be retrieved.

### Workflow Run Management

View, re-run, cancel, and view logs for workflow runs in GitHub Actions. You can list runs filtered by branch, event, status, or actor. Supports re-running all jobs, only failed jobs, or a specific job. You can approve runs from fork pull requests, review and approve/reject pending deployments, download or delete run logs, and get run usage/timing data.

### Workflow Job Inspection

View logs and workflow jobs in GitHub Actions. A workflow job is a set of steps that execute on the same runner. You can list jobs for a given run or run attempt, get details for a specific job (including step-level status and timing), and download job logs.

### Artifact Management

Download, delete, and retrieve information about workflow artifacts. Artifacts enable you to share data between jobs in a workflow and store data once that workflow has completed. You can list artifacts for a repository or a specific workflow run, download artifact archives, and delete artifacts.

### Secrets Management

Create, update, delete, and retrieve information about secrets that can be used in workflows. Secrets can be managed at three levels: organization, repository, and environment. Secret values must be encrypted with the repository's or organization's public key (using LibSodium) before being sent. For organization secrets, you can control which repositories have access to each secret.

### Variables Management

Create, read, update, and delete configuration variables at the organization, repository, and environment levels. Unlike secrets, variable values are not encrypted and are visible in API responses. Organization variables can be scoped to selected repositories.

### Cache Management

List, inspect, and delete GitHub Actions caches for a repository. You can also configure cache retention limits and storage limits at the enterprise, organization, and repository levels. Caches can be deleted by cache key or cache ID.

### Self-Hosted Runner Management

Register, list, get, and remove self-hosted runners at the organization and repository levels. You can create registration and removal tokens, configure just-in-time runners, and manage custom labels on runners. Self-hosted runner groups (organization-level) allow controlling which repositories can use specific runners.

### GitHub-Hosted Runner Management

List, create, update, and delete GitHub-hosted runners at the organization level. You can manage custom images and image versions, view available machine specs, platforms, and GitHub-owned/partner images, and query runner limits.

### Permissions and Policies

Configure GitHub Actions permissions at the organization and repository levels. This includes enabling/disabling Actions for selected repositories, restricting which actions and reusable workflows are allowed, setting default workflow permissions (read-only vs. read-write for `GITHUB_TOKEN`), configuring artifact/log retention periods, and managing fork pull request approval and workflow settings.

### OIDC Configuration

Get and set customization templates for OIDC subject claims at the organization and repository levels. This allows customizing the `sub` claim in OIDC tokens issued to workflows for use with cloud providers that support OIDC federation.

## Events

GitHub supports webhooks that can be configured at the repository or organization level. The following webhook event categories are specifically relevant to GitHub Actions:

### Workflow Run Events (`workflow_run`)

This event occurs when there is activity relating to a run of a GitHub Actions workflow. Activity types include `requested`, `completed`, and `in_progress`. To subscribe to this event, a GitHub App must have at least read-level access for the "Actions" repository permission.

### Workflow Job Events (`workflow_job`)

This event occurs when there is activity relating to a job in a GitHub Actions workflow. Activity types include `queued`, `in_progress`, `completed`, and `waiting`. Useful for autoscaling self-hosted runners based on job demand.

### Workflow Dispatch Events (`workflow_dispatch`)

This event occurs when a GitHub Actions workflow is manually triggered. For more information, see "Manually running a workflow." To subscribe to this event, a GitHub App must have at least read-level access for the "Contents" repository permission.

### Check Run Events (`check_run`)

This event occurs when there is activity relating to a check run. For information about check runs, see "Getting started with the Checks API." Activity types include `created`, `completed`, `rerequested`, and `requested_action`. GitHub Actions workflow jobs create check runs automatically.

### Check Suite Events (`check_suite`)

Occurs when a check suite is created, completed, or rerequested. A check suite groups check runs (including those from GitHub Actions) for a specific commit.

### Deployment and Deployment Status Events

`deployment` and `deployment_status` events fire when deployments are created or their statuses change, which is relevant when GitHub Actions workflows manage deployments to environments.
