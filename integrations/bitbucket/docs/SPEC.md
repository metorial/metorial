# Slates Specification for Bitbucket

## Overview

Bitbucket is an Atlassian-hosted Git repository management platform that provides source code hosting, pull requests, issue tracking, CI/CD pipelines, and team collaboration features. It is available as Bitbucket Cloud (hosted at bitbucket.org) and Bitbucket Data Center (self-hosted). The REST API (v2.0 for Cloud) enables programmatic management of workspaces, repositories, pull requests, pipelines, and more.

## Authentication

Bitbucket Cloud supports the following authentication methods:

### OAuth 2.0

Bitbucket Cloud REST API integrations and Atlassian Connect for Bitbucket add-ons can use OAuth 2.0 to access resources. For obtaining access/bearer tokens, Bitbucket supports Authorization Code Grant, Client Credentials Grant, and a custom Bitbucket JWT grant for exchanging JWT tokens for access tokens. Implicit Grant (4.2) and Resource Owner Password Credentials Grant (4.3) are no longer supported.

**Supported grant types:**

1. **Authorization Code Grant**: Request authorization from the end user by sending their browser to `https://bitbucket.org/site/oauth2/authorize?client_id={client_id}&response_type=code`. Exchange the returned authorization code for an access token by POSTing to `https://bitbucket.org/site/oauth2/access_token` with `grant_type=authorization_code` and the code, authenticating with `client_id:secret` via HTTP Basic Auth.

2. **Client Credentials Grant**: Obtain an access token that represents the owner of the client/consumer by POSTing to `https://bitbucket.org/site/oauth2/access_token` with `grant_type=client_credentials`.

3. **Bitbucket Cloud JWT Grant**: Exchange an Atlassian Connect JWT for an OAuth access token with `grant_type=urn:bitbucket:oauth2:jwt`.

**Setup:** OAuth needs a key and secret (together known as an OAuth consumer). You can create a consumer on any existing workspace. Navigate to Workspace Settings → OAuth consumers → Add consumer. Configure the callback URL and desired permission scopes during consumer creation.

**Token lifecycle:** Access tokens expire in one hour. Use a refresh token to obtain a new access token: POST to `https://bitbucket.org/site/oauth2/access_token` with `grant_type=refresh_token`.

**Scopes:** Scopes are defined on the client/consumer instance. Bitbucket Cloud does not currently support the use of the optional scope parameter on individual grant requests. Available scopes include:

- `repository` / `repository:write` / `repository:admin` / `repository:delete` — Read, write, admin, or delete access to repositories
- `pullrequest` / `pullrequest:write` — Read or write access to pull requests
- `issue` / `issue:write` — Read or write access to issues
- `snippet` / `snippet:write` — Read or write access to snippets
- `webhook` — Access to manage webhooks
- `pipeline` / `pipeline:write` / `pipeline:variable` — Access to pipelines
- `runner` / `runner:write` — Access to pipeline runners
- `account` / `account:write` — Read or write user account info
- `email` — Read user's primary email
- `project` / `project:admin` — Read or admin access to projects

### App Passwords (Deprecated)

Atlassian is announcing the deprecation of app passwords in Bitbucket Cloud and transitioning to API tokens. Integrations with app passwords will stop working entirely on June 9, 2026. App passwords use HTTP Basic Auth with `{bitbucket_username}:{app_password}`.

### API Tokens (Replacement for App Passwords)

API tokens are user-based tokens for scripting tasks and integrating tools. They are the long term replacement for App passwords. API tokens can be set to expire after a defined period, reducing the risk of long-term exposure. Created at Settings → Atlassian account settings → Security → Create API token with scopes. Used via HTTP Basic Auth with `{email}:{api_token}`.

### Repository / Workspace / Project Access Tokens

Access tokens for a repository are single-purpose, repository-based access tokens that can be created with limited scopes. Similar scoped tokens exist at the workspace and project level. These are used via HTTP Basic Auth.

## Features

### Repository Management

Create, read, update, delete, fork, and transfer Git repositories within workspaces. Configure repository settings such as privacy, description, language, branching model, and branch restrictions. Manage repository downloads and access permissions for users and groups.

### Pull Requests

Create, update, approve, decline, and merge pull requests. Manage reviewers and default reviewers. Support for draft pull requests and change request workflows. Comment on pull requests with inline code comments (single-line and multi-line). Configure merge strategies and enforce merge checks.

### Commits and Source Code

Browse repository source files at any revision. List and inspect commits across branches and tags. Comment on individual commits. Manage commit statuses (build statuses from CI/CD tools). View diffs between revisions.

### Branching and Refs

Create, list, and delete branches and tags. Configure branching models (e.g., feature, bugfix, hotfix, release prefixes). Set branch permissions to restrict who can push or merge.

### Issue Tracking

Bitbucket includes a built-in lightweight issue tracker per repository. Create, update, list, and query issues with fields like priority, status, type, component, milestone, and version. Import and export issue data. Comment on issues.

### Pipelines (CI/CD)

Pipelines permissions provide access to view or control Bitbucket Pipelines, including viewing pipelines, steps, deployment environments, and variables, as well as stopping, rerunning, resuming, and manually triggering pipelines. Manage pipeline configuration variables and deployment environments. Configure self-hosted runners.

### Workspaces and Projects

Manage workspaces that contain users, groups, and repositories. Create and configure projects to organize repositories. Control workspace membership and permissions. Manage workspace-level settings.

### Users and Permissions

List and manage workspace members and groups. Control access at workspace, project, and repository levels. View user profiles and account information.

### Snippets

Create, read, update, and delete code snippets (small pieces of code or text). Snippets support versioning and comments. They can be public or private.

### Webhooks

Create, list, update, and delete webhooks programmatically on repositories and workspaces. A webhook consists of a subject (the resource that generates events, currently the repository), one or more events (the default is a repository push, but multiple events can be selected), and a URL endpoint.

### Code Search

Search across code within repositories in a workspace.

### Deployments

View and manage deployment environments and track deployment history within Bitbucket Pipelines.

### Reports (Code Insights)

External tools can attach reports and annotations to commits, enabling code quality and security insights within pull requests.

## Events

Webhooks provide a way to configure Bitbucket Cloud to make requests to your self-hosted server (or another external service) whenever certain events occur in Bitbucket Cloud. Webhooks can be configured at the repository or workspace level. Each webhook specifies a URL and one or more event triggers.

### Repository Events

Events related to repository-level activity:

- **Push** (`repo:push`): Triggered when a user pushes one or more commits to a repository. Includes details of all updated references (branches/tags) and up to 5 recent commits per change.
- **Fork** (`repo:fork`): Triggered when a user forks a repository.
- **Updated** (`repo:updated`): Triggered when repository metadata (name, description, website, language) changes.
- **Transfer** (`repo:transfer`): Triggered when a repository transfer is accepted.
- **Commit Comment Created** (`repo:commit_comment_created`): Triggered when a user comments on a commit.
- **Build Status Created** (`repo:commit_status_created`): Triggered when a build status is initially set on a commit.
- **Build Status Updated** (`repo:commit_status_updated`): Triggered when a build status is updated on a commit.
- **Deleted** (`repo:deleted`): Triggered when a repository is hard deleted.

### Issue Events

Events related to the built-in issue tracker:

- **Issue Created** (`issue:created`): Triggered when a user creates an issue.
- **Issue Updated** (`issue:updated`): Triggered when a user updates an issue (includes change details).
- **Issue Comment Created** (`issue:comment_created`): Triggered when a user comments on an issue.

### Pull Request Events

Events related to pull request activity:

- **Created** (`pullrequest:created`): Triggered when a pull request is created.
- **Updated** (`pullrequest:updated`): Triggered when a pull request is updated.
- **Approved** (`pullrequest:approved`): Triggered when a user approves a pull request.
- **Approval Removed** (`pullrequest:unapproved`): Triggered when a user removes their approval.
- **Changes Requested** (`pullrequest:changes_request_created`): Triggered when a user requests changes on a pull request.
- **Changes Request Removed** (`pullrequest:changes_request_removed`): Triggered when a change request is removed.
- **Merged** (`pullrequest:fulfilled`): Triggered when a pull request is merged.
- **Declined** (`pullrequest:rejected`): Triggered when a pull request is declined.
- **Comment Created** (`pullrequest:comment_created`): Triggered when a user comments on a pull request.
- **Comment Updated** (`pullrequest:comment_updated`): Triggered when a pull request comment is updated.
- **Comment Deleted** (`pullrequest:comment_deleted`): Triggered when a pull request comment is deleted.
- **Comment Resolved** (`pullrequest:comment_resolved`): Triggered when a pull request comment is resolved.
- **Comment Reopened** (`pullrequest:comment_reopened`): Triggered when a resolved pull request comment is reopened.
