Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for GitHub

## Overview

GitHub is a cloud-based platform for version control and collaboration using Git. It provides hosting for software repositories along with features for issue tracking, code review, project management, CI/CD (GitHub Actions), and package hosting. GitHub offers both REST and GraphQL APIs for programmatic access to its platform resources.

## Authentication

GitHub supports several authentication methods for API access:

### 1. Personal Access Tokens (PATs)

Personal Access Tokens are preferred over passwords and provide granular control over permissions, enabling developers to create tokens that allow only specific actions. There are two types:

- **Fine-grained PATs** (recommended): Allow selecting specific repositories and precise permissions. Generated under **Settings > Developer settings > Personal access tokens > Fine-grained tokens**.
- **Classic PATs**: Use OAuth scopes for permission control. Generated under **Settings > Developer settings > Personal access tokens > Tokens (classic)**.

Tokens are passed via the `Authorization` header:

```
Authorization: Bearer <YOUR-TOKEN>
```

### 2. OAuth 2.0 (OAuth Apps)

Every registered OAuth app is assigned a unique Client ID and Client Secret. The client secret is used to get an access token for the signed-in user.

- **Authorization endpoint:** `https://github.com/login/oauth/authorize`
- **Token endpoint:** `https://github.com/login/oauth/access_token`
- **Flow:** Standard OAuth 2.0 Authorization Code flow. After a successful app authentication, GitHub provides a temporary code value, which must be POSTed back to GitHub with the client secret in exchange for an access token.

**Available OAuth Scopes:**

| Scope                                                  | Description                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `(no scope)`                                           | Read-only access to public information                                      |
| `repo`                                                 | Full access to public and private repositories                              |
| `repo:status`                                          | Read/write access to commit statuses                                        |
| `public_repo`                                          | Access to public repositories only                                          |
| `admin:org`                                            | Full management of organizations and teams                                  |
| `write:org` / `read:org`                               | Write or read access to organization membership                             |
| `admin:repo_hook`                                      | Full access to repository webhooks                                          |
| `admin:org_hook`                                       | Full access to organization webhooks                                        |
| `user`                                                 | Read/write access to user profile (includes `user:email` and `user:follow`) |
| `user:email`                                           | Read access to email addresses                                              |
| `gist`                                                 | Write access to gists                                                       |
| `notifications`                                        | Access to notifications                                                     |
| `workflow`                                             | Manage GitHub Actions workflow files                                        |
| `write:packages` / `read:packages` / `delete:packages` | Manage GitHub Packages                                                      |
| `project` / `read:project`                             | Access to user and organization projects                                    |
| `delete_repo`                                          | Delete repositories                                                         |
| `codespace`                                            | Create and manage codespaces                                                |
| `security_events`                                      | Access to code scanning API                                                 |
| `read:audit_log`                                       | Read audit log data                                                         |

### 3. GitHub Apps

GitHub Apps authentication allows third-party applications to act on behalf of a user or organization, involving creating a GitHub App, installing it on a user or organization's account, and authenticating requests using a private key.

- **Authentication as the app:** Generate a JSON Web Token (JWT) signed with the app's private key, then use it to obtain an installation access token.
- **Authentication on behalf of a user:** Uses an OAuth-like flow to obtain a user access token.
- GitHub Apps use fine-grained permissions instead of scopes, which give you more control over what your app can do.

### Base URL

All API requests are made to `https://api.github.com`.

## Features

### Repository Management

Create, read, update, and delete repositories. Manage repository settings including visibility (public/private), branch protection rules, collaborator access, deploy keys, and repository topics. Also supports forking, transferring ownership, and managing repository templates.

### Issues and Issue Tracking

Create and manage issues within repositories. Supports labels, milestones, assignees, and comments. Issues can be searched and filtered across repositories using a powerful search syntax.

### Pull Requests and Code Review

Create and manage pull requests including requesting reviewers, managing review comments, and merging. Supports diff and patch formats. Allows managing pull request reviews with approve, request-changes, and comment actions.

### Git Data

Low-level access to Git objects including blobs, trees, commits, refs, and tags. Allows reading and writing raw Git data in a repository.

### GitHub Actions and Workflows

Manage workflows, workflow runs, and artifacts. Trigger workflows, view run logs, and manage workflow secrets and variables. Also supports managing self-hosted runners.

### Organizations and Teams

Manage organization settings, memberships, teams, and team memberships. Control organization-level permissions, invitations, and outside collaborator access.

### Users and Profiles

Access and update user profile information, email addresses, SSH keys, GPG keys, and social accounts. View followers and following relationships.

### Projects

Create and manage GitHub Projects (the project board feature). Supports managing columns and cards for organizing issues and pull requests.

### Gists

Create, update, delete, and list gists (code snippets). Supports forking, starring, and commenting on gists.

### GitHub Packages

Publish, install, and manage packages. Supports multiple package ecosystems including npm, Maven, Docker, NuGet, and RubyGems.

### Code Search and Repository Search

Search across code, repositories, issues, pull requests, users, topics, and commits using GitHub's search syntax. Supports qualifiers for filtering results.

### Deployments and Environments

Using the Deployments REST API, you can build custom tooling that interacts with your server and a third-party app. Manage deployment statuses and environments for repositories.

### Checks and Commit Statuses

You can use the REST API to build GitHub Apps that run powerful checks against code changes in a repository. Create and manage check runs, check suites, and commit statuses for CI/CD integration.

### Content Management

Use the REST API to create, modify, and delete Base64 encoded content in a repository. Read and write files, directories, and symlinks within repositories.

### Notifications

Access and manage notification threads for watched repositories and subscriptions.

### Security and Code Scanning

Access code scanning alerts, secret scanning alerts, Dependabot alerts, and security advisories. Manage repository vulnerability settings.

### Codespaces

Create, manage, and delete cloud development environments. Configure machine types and manage secrets for codespaces.

### GraphQL API

In addition to the REST API, GitHub provides a GraphQL API (v4) that allows more flexible, efficient queries with the ability to request exactly the data needed in a single request.

## Events

Webhooks provide a way for notifications to be delivered to an external web server whenever certain events occur on GitHub. Webhooks let you subscribe to events happening in a software system and automatically receive a delivery of data to your server whenever those events occur.

You can create webhooks in a repository to subscribe to events that occur in that repository. You can create webhooks to subscribe to events that occur in a specific repository, organization, GitHub Marketplace account, GitHub Sponsors account, or GitHub App.

Webhooks are configured with a payload URL, content type (JSON or form), and an optional secret for signature verification. The webhook signature header is the HMAC hex digest of the request body, generated using the SHA-256 hash function and the secret as the HMAC key.

### Code & Repository Events

- **Push:** Triggered when commits are pushed to a branch or tag.
- **Create / Delete:** Triggered when a branch or tag is created or deleted.
- **Repository:** Triggered when a repository is created, deleted, archived, made public/private, or transferred.
- **Fork:** Triggered when a repository is forked.
- **Release:** Triggered when a release is published, edited, or deleted (including pre-releases).
- **Commit Comment:** Triggered when a comment is made on a commit.

### Pull Request Events

- **Pull Request:** Triggered for activity on pull requests (opened, closed, merged, assigned, labeled, review requested, etc.). Configurable by action type.
- **Pull Request Review:** Triggered when a review is submitted, edited, or dismissed.
- **Pull Request Review Comment:** Triggered for comments on a pull request diff.
- **Pull Request Review Thread:** Triggered when a comment thread on a pull request is resolved or unresolved.

### Issue Events

- **Issues:** Triggered for issue activity (opened, edited, closed, assigned, labeled, etc.).
- **Issue Comment:** Triggered when a comment is created, edited, or deleted on an issue or pull request.
- **Label:** Triggered when a label is created, edited, or deleted.
- **Milestone:** Triggered when a milestone is created, closed, edited, or deleted.

### CI/CD and Checks Events

- **Check Run / Check Suite:** Triggered for check run and check suite lifecycle events (created, completed, rerequested).
- **Workflow Job:** Triggered when a GitHub Actions workflow job is queued, in progress, or completed.
- **Workflow Run:** Triggered when a workflow run is requested, completed, or in progress.
- **Deployment / Deployment Status:** Triggered when a deployment is created or its status changes.
- **Status:** Triggered when the status of a commit changes.

### Organization and Team Events

- **Organization:** Triggered for organization-level events (member added/removed, renamed, etc.).
- **Team:** Triggered when a team is created, deleted, edited, or has members/repos added/removed.
- **Membership:** Triggered when a user is added to or removed from a team.
- **Member:** Triggered when a collaborator is added to a repository.

### Security Events

- **Code Scanning Alert:** Triggered when a code scanning alert is created, fixed, or dismissed.
- **Secret Scanning Alert:** Triggered when a secret scanning alert is created, resolved, or reopened.
- **Dependabot Alert:** Triggered for Dependabot vulnerability alert activity.
- **Repository Vulnerability Alert:** Triggered when a security vulnerability is detected.

### Discussion Events

- **Discussion:** Triggered for GitHub Discussions activity (created, edited, answered, etc.).
- **Discussion Comment:** Triggered when a comment on a discussion is created, edited, or deleted.

### Project Events

- **Projects V2 Item:** Triggered when an item in a GitHub Project is created, edited, or deleted.

### Other Events

- **Star:** Triggered when a repository is starred or unstarred.
- **Watch:** Triggered when a user watches a repository.
- **Wiki (Gollum):** Triggered when a wiki page is created or updated.
- **Page Build:** Triggered when a GitHub Pages site is built.
- **Package:** Triggered when a package is published or updated in GitHub Packages.
- **Sponsorship:** Triggered for GitHub Sponsors activity.
- **Marketplace Purchase:** Triggered for GitHub Marketplace purchase activity.
- **Ping:** A special event sent when a webhook is first created to verify the connection.
