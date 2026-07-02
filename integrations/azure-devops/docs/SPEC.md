Now let me get the full list of service hook events:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Azure DevOps

## Overview

Azure DevOps is a Microsoft platform providing developer services including Git repositories, CI/CD pipelines, work item tracking (Boards), test plans, and package feeds (Artifacts). It is available as a cloud service (Azure DevOps Services) and as a self-hosted product (Azure DevOps Server). All features are accessible programmatically via REST APIs at `https://dev.azure.com/{organization}`.

## Authentication

Azure DevOps supports several authentication methods:

### 1. Microsoft Entra ID OAuth 2.0 (Recommended)

The recommended approach for new production applications. Register an application with the Microsoft identity platform.

- **Registration**: Register your app in the Microsoft Entra admin center under App registrations.
- **Resource identifier**: `499b84ac-1321-427f-aa17-267ca6975798`
- **Resource URI**: `https://app.vssps.visualstudio.com`
- Add permissions for Azure DevOps (not Microsoft Graph) from the list of resources during app registration.
- **Authorization endpoint**: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize`
- **Token endpoint**: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
- Use the `.default` scope when requesting a token with all scopes that the app is permissioned for. For example: `499b84ac-1321-427f-aa17-267ca6975798/.default`
- Supports both delegated (on-behalf-of user) flows and application flows (service principals/managed identities).
- Microsoft Entra apps don't natively support Microsoft account (MSA) users for the Azure DevOps resource.
- Requires: `client_id`, `client_secret`, `tenant_id`, and the organization name.

**Granular Scopes** (used in both Entra ID and legacy OAuth): Scopes follow the `vso.*` naming convention. Key scopes include:

- `vso.work` / `vso.work_write` / `vso.work_full` — Work items
- `vso.code` / `vso.code_write` / `vso.code_manage` — Code/repos
- `vso.build` / `vso.build_execute` — Build pipelines
- `vso.release_manage` — Release pipelines
- `vso.project` / `vso.project_manage` — Projects
- `vso.profile` — User profiles
- `vso.identity` — Identities
- `vso.hooks_write` — Service hooks
- Some scopes include others (for example, `vso.code_manage` includes `vso.code_write`).

### 2. Personal Access Tokens (PATs)

You can use your PAT anywhere that your user credentials are required for authentication in Azure DevOps. PATs are passed using HTTP Basic Authentication with an empty username and the PAT as the password (Base64-encoded as `:{PAT}`).

- Created per-user via the Azure DevOps UI under User Settings.
- Scoped to specific organizations and permissions.
- Suitable for scripts and testing, not recommended for production apps.

### 3. Legacy Azure DevOps OAuth 2.0 (Deprecated)

Azure DevOps OAuth is deprecated and scheduled for removal in 2026. New app registrations are no longer accepted as of April 2025. Existing apps use:

- Authorization URL: `https://app.vssps.visualstudio.com/oauth2/authorize`
- Token URL: `https://app.vssps.visualstudio.com/oauth2/token`
- Azure DevOps Services supports only the web server flow (authorization code flow).

### Notes

- OAuth 2.0 and Microsoft Entra ID authentication are available for Azure DevOps Services only, not Azure DevOps Server.
- For on-premises scenarios, use .NET client libraries, Windows authentication, or personal access tokens.
- All API calls require an `organization` name and are made against `https://dev.azure.com/{organization}`.

## Features

### Work Item Tracking (Boards)

Manage work items such as bugs, tasks, user stories, epics, and features. Create, read, update, and delete work items. Query work items using WIQL (Work Item Query Language). Manage work item types, fields, tags, and attachments. Configure boards, backlogs, sprints, and iterations.

- Supports filtering by area path, iteration path, work item type, and tags.
- Work items can be linked to each other and to commits, pull requests, and builds.

### Git Repositories (Repos)

Manage Git repositories, branches, commits, and pull requests. Create and configure repositories, browse file trees and content, compare diffs, and manage branch policies.

- Pull requests support creating, updating, reviewing, commenting, approving/rejecting, and completing merges.
- Also supports TFVC (Team Foundation Version Control) for check-ins and changesets.

### Pipelines (CI/CD)

Manage build and release pipelines programmatically. Trigger pipeline runs, query run history, view logs, and manage pipeline definitions. Supports both YAML-based pipelines and classic (UI-based) build/release pipelines.

- Can configure pipeline variables, environments, approvals, and deployment gates.
- Manage agent pools and agent queues.

### Test Plans

Access and manage test plans, test suites, test cases, and test results. Create test runs and query test outcomes.

### Artifacts (Package Management)

Manage package feeds for NuGet, npm, Maven, Python, and Universal Packages. Publish, list, and manage package versions within feeds.

- PATs are not supported as API keys directly for Azure Artifacts; use credential providers instead.

### Projects & Organizations

Create and manage projects within an organization. Configure project properties, process templates, and team settings. Manage organization-level settings, users, groups, and permissions.

### Dashboards & Widgets

Create and manage dashboards and their widgets to display project metrics and analytics.

### Wiki

Create, read, and update wiki pages attached to a project. Supports both project wikis and code-backed wikis (published from a Git repo).

### Service Hooks

Programmatically create, manage, and query service hook subscriptions to integrate Azure DevOps events with external services.

### Security & Permissions

Manage access control lists (ACLs), security namespaces, and permissions for users and groups across organizations, projects, and individual resources.

## Events

Azure DevOps supports webhooks via its **Service Hooks** mechanism. Webhooks provide a way to send a JSON representation of an Azure DevOps event to any service that has a public endpoint. Subscriptions can be created through the UI or programmatically via the REST API. Only HTTPS endpoints are supported. HTTP has the potential to send private data unencrypted. You must use HTTPS for basic authentication on a webhook.

Each subscription targets a specific event type and can include filters to narrow which events trigger the webhook. The payload detail level (All, Minimal, or None) can be configured per subscription.

### Build and Release Events

Events related to CI/CD pipelines using the classic model. Includes: build completed, release created, release abandoned, deployment approval pending, deployment approval completed, deployment started, and deployment completed.

- Can filter by pipeline definition, build status (succeeded/failed/partially succeeded/stopped), environment, and approval status/type.

### Pipeline Events

Events related to YAML pipelines. Includes: run state changed, run stage state changed, run job state changed, run stage waiting for approval, run stage approval completed, check updated, elastic agent pool resized, manual intervention pending, and agent pool created/updated.

- Can filter by pipeline ID, stage name, job name, state (e.g., InProgress, Completed), and result (e.g., Succeeded, Failed, Canceled).

### Code Events

Events related to source control activity. Includes: code pushed (Git), code checked in (TFVC), pull request created, pull request updated, pull request merge attempted, pull request commented on, and repository created/deleted/forked/renamed/status changed.

- Can filter by repository, branch, pusher, pull request creator, reviewers, merge result, and notification type (e.g., status change, vote change, reviewer change, source branch push).

### Work Item Events

Events related to work item changes. Includes: work item created, updated, deleted, restored, and commented on.

- Can filter by area path, work item type, tag, changed fields, link changes, and comment pattern.

### Service Connection Events

Events related to service connection lifecycle. Includes: service connection created and service connection updated.

- Can filter by project.

### Advanced Security Events

Events related to GitHub Advanced Security for Azure DevOps. Includes: alert created, alert state changed, and alert updated.

- Can filter by repository, branch, alert type (dependency, secret, code), and severity (low, medium, high, critical).
