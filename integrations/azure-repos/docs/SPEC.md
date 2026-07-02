Now let me get the specific scopes and the full list of service hook events for code/repos:# Slates Specification for Azure Repos

## Overview

Azure Repos is the Git-based source control service within Azure DevOps. It provides private Git repositories for managing code, with features for pull requests, branch policies, code review, and repository management. It is accessible via the Azure DevOps REST API under the `_apis/git/` area.

## Authentication

Azure Repos is accessed through the Azure DevOps REST API, which supports the following authentication methods:

### 1. Microsoft Entra ID OAuth (Recommended)

Microsoft Entra ID authentication is the recommended approach for production applications. This uses the standard OAuth 2.0 authorization code flow via Microsoft Entra ID (formerly Azure AD).

- **Registration**: Register an application in Microsoft Entra ID (Azure portal).
- **Resource URI**: `499b84ac-1321-427f-aa17-267ca6975798` (Azure DevOps resource identifier).
- **Token endpoint**: Standard Microsoft Entra ID token endpoints (`https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`).
- **Tenant ID**: Required — the Microsoft Entra tenant associated with the Azure DevOps organization.
- **Scopes for Azure Repos**:
  - `vso.code` — Read source code, metadata about commits, branches, and other version control artifacts.
  - `vso.code_write` — Read, update, and delete source code; create and manage pull requests.
  - `vso.code_manage` — Full repository management including creating/deleting repositories.
  - `vso.code_full` — Full access to all source code operations.
  - `vso.code_status` — Read and write commit and pull request status.
- Some scopes include others (for example, `vso.code_manage` includes `vso.code_write`).
- Supports service principals and managed identities for non-interactive scenarios.

### 2. Personal Access Tokens (PATs)

While personal access tokens (PATs) can be used for simple scripts, Microsoft Entra ID provides better security and governance capabilities.

- Created in the Azure DevOps UI under User Settings → Personal Access Tokens.
- PATs are always associated with the user identity that created them.
- Passed via HTTP Basic Authentication with an empty username and the PAT as the password, Base64-encoded in the `Authorization: Basic` header.
- PATs can be scoped to specific permissions (e.g., Code Read, Code Read & Write).
- Maximum validity can be set up to one year; tokens can be revoked at any time.

### 3. Azure DevOps OAuth (Deprecated)

Azure DevOps OAuth is deprecated and scheduled for removal in 2026. This documentation is for existing Azure DevOps OAuth apps only. New app registrations are no longer accepted as of April 2025.

- **Authorization URL**: `https://app.vssps.visualstudio.com/oauth2/authorize`
- **Token URL**: `https://app.vssps.visualstudio.com/oauth2/token`
- Uses the authorization code flow with `response_type=Assertion`.
- Azure DevOps Services supports only the web server flow (authorization code flow), which requires securely storing an app secret.

### Required Inputs

All API calls require:

- **Organization**: The Azure DevOps organization name (e.g., `dev.azure.com/{organization}`).
- **Project**: The team project name or ID (for project-scoped operations).

## Features

### Repository Management

Create, list, retrieve, update, and delete Git repositories within a team project. Repositories can also be forked from existing repositories across projects. You can enable/disable repositories and configure repository settings.

- Repositories are scoped to a team project within an organization.
- Supports forking with optional source ref specification.

### Branch Management

List, create, update, and delete branches (refs) in a repository. View branch statistics and compare branches.

- Branches are managed as Git refs (`refs/heads/*`).
- Branch policies can be configured programmatically to enforce rules like minimum reviewers, build validation, and merge strategies.

### Pull Requests

Create, update, query, and complete pull requests. Manage reviewers, vote on changes, leave threaded comments, and view diffs.

- PRs can be filtered by status (active, completed, abandoned), creator, reviewer, source/target branch.
- Supports draft pull requests.
- PR comment threads support inline code comments and general discussion.
- PR statuses can be posted by external services (e.g., CI systems) to gate completion.
- Auto-completion can be set with configurable merge strategies (merge, squash, rebase).

### Commits and Pushes

Browse commit history, view commit details, compare commits, and list pushes to a repository.

- Commits can be queried by author, date range, path, and branch.
- Push data includes ref updates and associated commits.

### Items and Blobs

Retrieve files, folders, and their content from a repository at a specific version (branch, tag, or commit).

- Supports downloading individual files or folder structures.
- Content can be retrieved in various formats (raw, JSON metadata, zip).

### Branch Policies

Programmatically manage branch policies such as minimum reviewer count, required build validation, comment resolution requirements, merge strategy restrictions, and automatic reviewer assignment.

- Policies are scoped to specific branches or branch patterns.
- Bypass permissions can be configured for specific users or groups.

### Forks

Create and manage repository forks, including cross-project forks. Sync fork operations allow keeping forks up to date with the parent repository.

### Code Search

Search across repositories for code matching specific text, with support for filtering by repository, branch, path, and file extension. This is a separate API under the search area.

## Events

Azure DevOps supports webhooks via **Service Hooks**. You can use service hooks to run tasks on other services when events happen in your Azure DevOps project. Webhooks provide a way to send a JSON representation of an Azure DevOps event to any service that has a public endpoint. Subscriptions can be created via the UI or programmatically through the Service Hooks REST API.

The following event categories are relevant to Azure Repos:

### Code Push Events

Triggered when code is pushed to a Git repository.

- **Event**: `git.push`
- **Filters**: Branch, repository, pushed-by user group.

### Pull Request Events

Triggered on pull request lifecycle changes.

- **Pull request created** (`git.pullrequest.created`): A new PR is opened. Filterable by repository, branch, creator, and reviewer group.
- **Pull request updated** (`git.pullrequest.updated`): A PR is modified — status change, reviewer list change, vote change, or source branch push. Filterable by change type (`PushNotification`, `ReviewersUpdateNotification`, `StatusUpdateNotification`, `ReviewerVoteNotification`), repository, branch, creator, and reviewer group.
- **Pull request merge attempted** (`git.pullrequest.merged`): A PR merge is attempted. Filterable by merge result (Succeeded, Conflicts, Failure, etc.).
- **Pull request commented on** (`ms.vss-code.git-pullrequest-comment-event`): A comment is added or edited on a PR. Filterable by repository and branch.

### Repository Lifecycle Events

Triggered on repository management operations.

- **Repository created** (`git.repo.created`): A new repository is created. Filterable by project.
- **Repository deleted** (`git.repo.deleted`): A repository is deleted. Filterable by repository.
- **Repository forked** (`git.repo.forked`): A repository is forked. Filterable by repository.
- **Repository renamed** (`git.repo.renamed`): A repository is renamed. Filterable by repository.
- **Repository status changed** (`git.repo.statuschanged`): A repository is enabled/disabled. Filterable by repository.

### TFVC Check-in Events

Triggered when a changeset is checked into TFVC (Team Foundation Version Control).

- **Event**: `tfvc.checkin`
- **Filters**: File path (required).
