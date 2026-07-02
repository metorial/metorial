# Slates Specification for Docker Hub

## Overview

Docker Hub is a cloud-based container image registry that allows users to store, share, and distribute Docker container images. It provides RESTful endpoints for managing Docker images, repositories, organizations, and other related functionalities. It serves as the default registry for Docker CLI and supports both public and private repositories.

## Authentication

Docker Hub uses a **credential-based authentication** flow to obtain a short-lived bearer token for API access.

**Obtaining a bearer token:**

Authenticate by sending a POST request with an identifier and secret to `https://hub.docker.com/v2/auth/token`, which returns a short-lived access token. Include this token in subsequent requests via the `Authorization: Bearer <token>` header.

**Personal Access Tokens (PATs):**

Personal access tokens (PATs) provide a secure alternative to passwords for Docker CLI authentication. Use PATs to authenticate automated systems, CI/CD pipelines, and development tools without exposing your Docker Hub password.

PATs can be used in place of your password when obtaining a bearer token. Pro and Team plan members have access to 4 scopes: Read, write, delete (full repo access); Read, write; Read only; and Public repo read only. Free users can continue to use their single read, write, delete token.

**Organization Access Tokens (OATs):**

Organization access tokens (OATs) provide secure, programmatic access to Docker Hub for automated systems, CI/CD pipelines, and other business-critical tasks. Unlike personal access tokens tied to individual users, OATs are associated with your organization and can be managed by any organization owner.

OATs can be scoped to read public repositories, and you can add specific repositories with per-repository permissions of Image Pull or Image Push, with up to 50 repositories per token.

**Two-Factor Authentication (2FA):**

When you have two-factor authentication turned on, PATs are required, providing secure CLI access without bypassing 2FA protection.

## Features

### Repository Management

Create, list, update, and delete Docker image repositories under a user account or organization namespace. You can create a repository to share images with your team, customers, or the Docker community. Repositories can be set as public or private.

### Image Tag Management

Tags let you manage multiple versions of images within a single Docker Hub repository. By adding a specific tag to each image, you can organize and differentiate image versions for various use cases. You can list, inspect, and delete tags for a repository via the API.

### Image Search and Discovery

You can explore the content library, featuring millions of images for operating systems, frameworks, databases, and more. The API supports searching for public images and repositories.

### Organization and Team Management

In Docker Hub, an organization is a collection of teams. Image repositories can be created at the organization level. The API allows managing organization members, teams, and repository-level permissions (read, write, admin) for teams.

### Access Token Management

You can manage tokens through the Hub APIs. This includes creating, listing, reading, updating, and revoking both personal and organization access tokens programmatically. Organization access tokens can be scoped to organization or repository resources.

### Repository Team Access

Docker Hub teams can be granted repository access with read, write, or admin permission. This integration supports assigning a team to a repository after listing or creating the team.

### Immutable Tags

Docker Hub supports immutable tag settings on repositories. Immutable tag rules can be updated and verified so repository administrators can prevent matching tags from being overwritten.

### Audit Logs

You can view activity logs using the Docker Hub API via the Audit logs endpoints. Audit log displays a chronological list of activities that occur at organization and repository levels. This includes tracking actions like repository changes, team membership updates, and settings modifications.

- Docker Home retains activity logs for 30 days. To retrieve activities beyond 30 days, you must use the Docker Hub API.

### Webhook Management

You can create and manage webhooks on repositories via the API. Webhooks trigger an action in another service in response to a push event in the repository. You can list, create, and delete webhooks and their associated hook URLs for repositories you own.

## Events

Docker Hub supports webhooks at the repository level.

### Image Push Events

You can use webhooks to cause an action in another service in response to a push event in the repository. Webhooks are POST requests sent to a URL you define in Docker Hub. Docker Hub webhooks fire when an image is built in, pushed or a new tag is added to, your repository.

- Webhooks are configured per repository.
- The payload includes push data (pusher, tag, timestamp) and repository metadata (name, namespace, description, visibility).
- Webhooks support a callback mechanism where the receiver can POST back a status (success, failure, error) to acknowledge processing.
- Docker Hub does not natively implement any mechanism whereby receivers may authenticate inbound webhook requests. There is no signature verification on webhook payloads.
