Now let me get the full list of OAuth scopes and webhook event types from GitLab's documentation:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for GitLab

## Overview

GitLab is a web-based DevOps platform that provides Git repository management, CI/CD pipelines, issue tracking, code review, and package registries. It is available as a SaaS offering (GitLab.com) and as a self-managed instance. The API is provided via both REST (v4) and GraphQL interfaces.

## Authentication

GitLab supports multiple authentication methods:

### Personal Access Tokens

You can use access tokens to authenticate with the API. Pass the token using the `PRIVATE-TOKEN` header (recommended) or as a query parameter. Tokens are created under **Edit Profile > Personal access tokens** with specific scopes and an expiration date. You can also use personal, project, or group access tokens with OAuth-compliant headers, e.g., `Authorization: Bearer <token>`.

Token types include:

- **Personal access tokens** — scoped to a user.
- **Project access tokens** — scoped to a specific project.
- **Group access tokens** — scoped to a specific group.

### OAuth 2.0

Use this API to allow third-party services to access GitLab resources for a user with the OAuth 2.0 protocol.

**Supported OAuth 2.0 flows:**

Authorization code with Proof Key for Code Exchange (PKCE): Most secure. Without PKCE, you'd have to include client secrets on mobile clients, and is recommended for both client and server apps.

- **Authorization Code** (with or without PKCE) — recommended for server-side and client apps.
- **Device Authorization Grant** — for input-constrained devices without browser access (GitLab 17.9+).
- **Resource Owner Password Credentials** — for trusted first-party services only. Resource owner password credentials are disabled for users with two-factor authentication turned on.

**Endpoints:**

- Authorization: `https://<gitlab-host>/oauth/authorize`
- Token: `https://<gitlab-host>/oauth/token`
- Revoke: `https://<gitlab-host>/oauth/revoke`
- Device Authorization: `https://<gitlab-host>/oauth/authorize_device`

**Setup:** Register an OAuth application under **Edit Profile > Applications** (user-owned), **Group Settings > Applications** (group-owned), or **Admin > Applications** (instance-wide). You receive an Application ID (client ID) and Client Secret.

Access tokens expire after two hours. Integrations that use access tokens must generate new ones using the `refresh_token` attribute. Refresh tokens may be used even after the `access_token` itself expires.

**Available OAuth Scopes:**

| Scope                    | Description                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `api`                    | Complete read/write access to the API, including all groups, projects, registries, and packages. |
| `read_api`               | Read-only access to the API.                                                                     |
| `read_user`              | Read-only access to the user's profile via `/user` and `/users`.                                 |
| `create_runner`          | Permission to create runners.                                                                    |
| `manage_runner`          | Permission to manage runners.                                                                    |
| `k8s_proxy`              | Permission for Kubernetes API calls via the agent.                                               |
| `read_repository`        | Read-only access to repositories via Git-over-HTTP.                                              |
| `write_repository`       | Read-write access to repositories via Git-over-HTTP.                                             |
| `read_registry`          | Read-only access to container registry images.                                                   |
| `write_registry`         | Write access to container registry images.                                                       |
| `read_virtual_registry`  | Read-only access to dependency proxy and virtual registries.                                     |
| `write_virtual_registry` | Read/write/delete access to dependency proxy.                                                    |
| `ai_features`            | Access to GitLab Duo AI-related endpoints.                                                       |
| `sudo`                   | Perform API actions as any user (admin only).                                                    |
| `admin_mode`             | Perform API actions as admin when Admin Mode is enabled.                                         |
| `openid`                 | Authenticate via OpenID Connect; read-only access to profile and group memberships.              |
| `profile`                | Read-only access to user profile via OpenID Connect.                                             |
| `email`                  | Read-only access to the user's primary email via OpenID Connect.                                 |

By default, the scope of the access token is `api`, which provides complete read/write access.

**Self-managed instances:** For self-hosted GitLab, replace `gitlab.com` with your instance hostname in all endpoints. The user may need to provide their GitLab instance URL as a custom input.

### CI/CD Job Tokens

In GitLab CI/CD jobs, the token is available as the `CI_JOB_TOKEN` variable. This is only relevant for automation running within GitLab CI/CD pipelines and is not typically used for external integrations.

## Features

### Project & Repository Management

Create, list, update, delete, archive, fork, and transfer projects. Manage project features like issue tracking, merge requests, and CI/CD. Browse repository trees, read and write files, compare branches, and manage branches and tags. Access repository contributors and generate changelogs.

### Issues & Work Items

Create and manage issues, including labels, milestones, assignees, due dates, weights, and time tracking. Supports confidential issues, issue links, and moving issues between projects. Work items (epics, tasks, objectives, key results) are also supported.

### Merge Requests & Code Review

Create, update, list, and merge merge requests. Manage reviewers, approvals, and approval rules. View diffs, commits, and discussions. Support for merge request pipelines, draft/WIP status, and squash-on-merge options.

### CI/CD Pipelines & Jobs

Trigger, list, retry, and cancel pipelines. View and manage individual jobs, download artifacts, and access job logs. Manage pipeline schedules, CI/CD variables (project-level, group-level, instance-level), and environments. Lint CI configuration files.

### Groups & Namespaces

Create and manage groups, subgroups, and group memberships. Control group settings, access levels, and sharing permissions. Manage group-level CI/CD variables, runners, and labels.

### Users & Access Management

List and manage users, SSH keys, and GPG keys. Manage project/group membership and role assignments. Supports SCIM for user provisioning with identity providers.

### Container & Package Registries

Manage container registry repositories and tags. Access the package registry for various formats (npm, Maven, PyPI, NuGet, Conan, etc.). Upload, list, and delete packages.

### Releases & Deployments

Create and manage releases with release notes, assets, and links. Manage deployments and environments. Track deployment status and history.

### Wikis & Snippets

Create, list, update, and delete wiki pages within projects or groups. Manage snippets (code/text fragments) at the project or personal level.

### Search

Global, group, and project-level search across code, issues, merge requests, milestones, wiki content, and commits.

### Admin & Instance Management (Self-Managed)

Manage instance settings, license, features, Sidekiq metrics, broadcast messages, and application appearance. Available only for administrators on self-managed instances.

### GraphQL API

GraphQL is a query language for APIs that allows clients to request exactly the data they need, making it possible to get all required data in a limited number of requests. Most resources available via REST are also accessible via the GraphQL API at `/api/graphql`. The GraphQL API is versionless.

## Events

GitLab supports webhooks at three levels: project, group, and system (instance). Webhooks connect GitLab to your other tools and systems through real-time notifications. When important events happen in GitLab, webhooks send that information directly to your external applications. Webhooks can be managed via the UI or the API. A secret token can be configured for verifying webhook payloads via the `X-Gitlab-Token` header.

Group webhooks are a Premium-licensed feature.

### Push Events

Triggered when code is pushed to a repository. Can be filtered by branch using a branch filter pattern. Push events are triggered when you push to the repository, except when: You push tags. A single push includes changes for more than three branches by default.

### Tag Push Events

Triggered when tags are created or deleted in a repository.

### Work Item / Issue Events

Work item events are triggered when a work item is created, edited, closed, or reopened. Covers issues, Service Desk issues, epics, tasks, and other work item types. Actions include open, close, reopen, and update.

### Merge Request Events

Triggered when merge requests are created, updated, merged, closed, or reopened. Includes approval and reviewer status changes.

### Comment (Note) Events

Comment events triggered when the comment is edited introduced in GitLab 16.11. Triggered on comments posted to commits, merge requests, issues, and snippets. Fires on both creation and editing.

### Pipeline Events

Triggered when a CI/CD pipeline status changes (e.g., pending, running, success, failed).

### Job Events

Triggered when the status of a CI/CD job changes.

### Deployment Events

Triggered when a deployment starts, succeeds, fails, or is canceled.

### Wiki Page Events

Triggered when a wiki page is created, updated, or deleted.

### Release Events

Triggered when a release is created, updated, or deleted.

### Milestone Events

Triggered when a milestone is created, updated, closed, or activated.

### Feature Flag Events

Triggered when a feature flag is toggled on or off.

### Resource Access Token Events

Triggered when a project or group access token is created, revoked, or expires.

### Confidential Events

Issues and notes have separate confidential event triggers, allowing webhooks to be configured for confidential items specifically.

### System Hooks (Instance-Level)

Available for self-managed administrators. Triggered by instance-wide events such as project creation/deletion, user creation/deletion, group membership changes, key additions, and repository updates.
