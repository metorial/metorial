Now let me get the specific webhook event types and the token scopes list:Now I have comprehensive information to write the specification.

# Slates Specification for Gitea

## Overview

Gitea is an open-source, self-hosted Git service for software development. It supports creating and managing repositories, browsing commit history and code files, reviewing and merging code submissions, managing collaborators, handling branches, and more. It tracks project requirements, features, and bugs through columns and issues, supporting branches, tags, milestones, assignments, time tracking, due dates, dependencies, and more. It also supports over 20 different types of public or private software package management.

## Authentication

Gitea is self-hosted, so all API requests go to the user's own instance at `https://<gitea-instance>/api/v1/`. The base URL is a required custom input.

### Personal Access Tokens (API Key)

Tokens can be created via the Gitea web interface under Settings → Applications → Generate New Token. Gitea supports scoped access tokens, which allow users to restrict tokens to operate only on selected URL routes.

Tokens are passed via the `Authorization` header. For historical reasons, Gitea needs the word `token` included before the API key token: `Authorization: token <YOUR_TOKEN>`.

Available token scopes (each with `read` and `write` levels):

- `activitypub` — ActivityPub operations
- `admin` — Site-wide admin operations
- `issue` — Issues, labels, milestones
- `misc` — Reserved for future usage
- `notification` — User notifications
- `organization` — Organization and team management
- `package` — Package operations
- `repository` — Repository files, pull requests, releases
- `user` — User-related operations

### OAuth2 (Authorization Code Grant)

Gitea supports acting as an OAuth2 Provider, allowing third-party applications to access its resources with user consent. At the moment Gitea only supports the Authorization Code Grant standard with additional support of PKCE and OpenID Connect (OIDC).

- **Register an application** at `https://<gitea-instance>/user/settings/applications` to obtain a Client ID and Client Secret.
- **Authorization endpoint:** `https://<gitea-instance>/login/oauth/authorize`
- **Token endpoint:** `https://<gitea-instance>/login/oauth/access_token`
- **OpenID Connect Discovery:** `https://<gitea-instance>/.well-known/openid-configuration`
- **UserInfo endpoint:** `https://<gitea-instance>/login/oauth/userinfo`
- **JWKS endpoint:** `https://<gitea-instance>/login/oauth/keys`

Gitea supports both confidential and public client types, as defined by RFC 6749. Public clients can use PKCE instead of a client secret.

As of version v1.23, Gitea supports granular scopes for OAuth2, allowing third parties to request more limited access using the same scopes available for Personal Access Tokens. The default OIDC scopes (`openid`, `email`, `profile`, `groups`) grant full access unless granular scopes are specified.

### Basic Authentication

Gitea supports HTTP Basic Authentication with username and password. When two-factor authentication is enabled, an additional `X-Gitea-OTP` header containing the TOTP code is required. Basic auth is primarily used for generating API tokens programmatically and is not recommended for regular API use.

## Features

### Repository Management

Create, list, update, delete, fork, mirror, star, watch, and transfer repositories. Manage branches, tags, releases, collaborators, and deploy keys. Read and write repository files and commit history. Supports repository search and topic management.

### Pull Requests and Code Review

Create and manage pull requests including reviews, review comments, and merge operations. Supports assigning reviewers, labels, and milestones to pull requests.

### Issue Tracking

Create and manage issues with support for labels, milestones, assignees, comments, attachments, reactions, dependencies, and time tracking. Includes a stopwatch feature for tracking time spent on issues.

### Organization and Team Management

Create and manage organizations, list org visibility, and manage teams including team members and permissions. Control team access to repositories.

### User Management

Manage user profiles, email addresses, SSH and GPG keys, followers, starred repositories, and user settings. Admin users can manage all user accounts on the instance.

### Package Registry

Gitea supports more than 20 different kinds of public or private package management, including Cargo, Chef, Composer, Conan, Conda, Container, Helm, Maven, NPM, NuGet, Pub, PyPI, RubyGems, Vagrant, etc. Packages can be listed, downloaded, and published via the API.

### CI/CD (Gitea Actions)

Gitea features an integrated CI/CD system, Gitea Actions, that is compatible with GitHub Actions. Users can create workflows using YAML format or utilize existing plugins. Manage action secrets, variables, runners, and workflow runs via the API.

### Notifications

Read and manage user notifications, mark notifications as read, and manage repository subscription settings.

### Administration

Instance-level admin operations including managing users, organizations, cron jobs, and system settings. The API allows admin users to sudo API requests as another user.

### Wiki

Manage repository wiki pages including creating, reading, updating, and deleting wiki content.

## Events

Gitea supports webhooks for repository events, configurable in repository settings. Webhooks can also be configured on a per-organization and whole system basis.

Webhooks deliver a JSON payload to a configured URL with an `X-Gitea-Event` header identifying the event type. A shared secret can be configured to verify payloads via the `X-Gitea-Signature` HMAC header. A branch filter can be applied to narrow which branches trigger events.

The following webhook event categories are supported:

### Push Events

Triggered when commits are pushed to a repository.

### Repository Events

Triggered on repository-level actions such as creation, deletion, or forking.

### Branch/Tag Lifecycle

`create` and `delete` events are triggered when branches or tags are created or deleted.

### Issue Events

Covers issue creation and updates. Sub-events include issue assignment changes (`issue_assign`), label changes (`issue_label`), milestone changes (`issue_milestone`), and new comments (`issue_comment`).

### Pull Request Events

Covers pull request creation and updates. Sub-events include assignment changes (`pull_request_assign`), label changes (`pull_request_label`), milestone changes (`pull_request_milestone`), comments (`pull_request_comment`), reviews (`pull_request_review`), and sync/update events (`pull_request_sync`).

### Release Events

Triggered when a release is created, updated, or deleted.

### Wiki Events

Triggered when wiki pages are created, edited, renamed, or deleted.

### Package Events

Triggered when packages are created or deleted.
