Now let me get details on the auth token formats and the dynamic secrets/share features:Now I have enough information to write the specification.

# Slates Specification for Doppler

## Overview

Doppler is a centralized secrets management platform that allows teams to store, manage, and sync environment variables and secrets across applications, environments, and infrastructure. It provides a RESTful API for programmatic access to secrets, projects, configurations, and workplace management, with integrations to sync secrets to cloud providers and other services.

## Authentication

Doppler uses token-based authentication via Bearer tokens sent in the `Authorization` header. The Doppler API is a RESTful service that uses high entropy tokens for authentication.

All API requests are made to `https://api.doppler.com` and authenticated using:

```
Authorization: Bearer <token>
```

### Token Types

Doppler provides various authentication tokens, each with a unique format for identification, including CLI, Personal, Service, Service Account, Service Account Identity, SCIM, and Audit tokens.

The key token types for API integration are:

1. **Personal Token** (prefix: `dp.pt.`): Generated via the Doppler dashboard. Provides access scoped to the user's permissions across the entire workplace. Suitable for development and scripting.

2. **Service Token** (prefix: `dp.st.`): Provides read-only access to a specific config within a project, adhering to the principle of least privilege. Recommended for production environments and automated systems. Can be created with an optional expiration.

3. **Service Account Token** (prefix: `dp.sa.`): Associated with a service account rather than a human user. Provides access based on the service account's assigned workplace role and project-level permissions.

4. **OIDC (Service Account Identity)**: Identities allow a service account to authenticate to Doppler via OIDC without using a static API token. Any tool that can generate OIDC tokens (e.g., CI tools like GitHub or GitLab) is compatible with Doppler. To authenticate, make a POST request to `https://api.doppler.com/v3/auth/oidc` with an `identity` ID and the OIDC `token`. The response JSON contains a short-lived API token that can be used as a Bearer token when using the Doppler API.

5. **Audit Token** (prefix: `dp.audit.`): Used specifically for the Audit API endpoints, which provide read-only access to workplace and user audit data.

## Features

### Secrets Management

Store, retrieve, update, and delete secrets (environment variables) within project configs. Secrets can be downloaded in various formats (JSON, ENV, YAML). Supports secret references across projects, multi-line values, notes per secret, version history, and value redaction. Secrets management includes methods for importing and referencing secrets, secret visibility, version history, and redaction, as well as advanced functionalities such as multi-line secrets, secret generation, and referencing secrets across projects.

### Projects and Environments

Organize secrets into projects, each containing environments (e.g., development, staging, production). Each environment has one or more configs that hold the actual secret values. Configs support cloning, locking/unlocking, and inheritance hierarchies.

### Config Logs and Rollback

Track all changes made to a config's secrets over time. Each change is logged with details of what was modified. Supports rolling back a config to a previous state.

### Dynamic Secrets

Issue and revoke short-lived, on-demand credential leases for supported services (e.g., databases). For organizations interested in further reducing risk, Dynamic Secrets can be a superior option compared to static secret rotation.

### Secret Rotation

Secret rotation is the act of updating a secret with a new value, either automatically at a defined cadence or by manually triggering it. Doppler uses a two-secret strategy, requiring the service to support at least two active secret instances at a time and programmatically creating, deleting, or updating secrets.

### Integrations and Secrets Sync

Configure integrations with third-party services and set up automatic syncing of secrets to external destinations such as AWS Secrets Manager, GCP, Vercel, and others. Manage sync configurations programmatically.

### Trusted IPs

Restrict access to specific configs by whitelisting IP addresses. Only requests originating from trusted IPs will be allowed to fetch secrets for that config.

### Workplace and User Management

Manage workplace settings, users, and groups. Assign workplace-level and project-level roles with granular permissions. Manage project membership to control who can access which projects and environments.

### Service Accounts

Create and manage non-human service accounts for automated systems. Service accounts can have tokens or OIDC-based identities for authentication, with configurable role assignments.

### Change Requests

Create change request workflows that require review and approval before secrets are modified. Configure change request policies to enforce approval requirements on specific configs.

### Secret Sharing

Share individual secrets securely via generated links, either as plain text with an expiration or with end-to-end encryption.

### Activity and Audit Logs

Doppler comes with fine-grained access controls, logs, versioning, and a seamless CLI. View workplace-wide activity logs and per-config change history. A separate Audit API (authenticated with audit tokens) provides read-only access to workplace and user audit data.

## Events

Doppler supports webhooks that fire when secrets change within a project config.

### Secret Change Events

Webhooks enable you to perform actions in third-party systems when your secrets change. You can use them to do things like automatically restart or redeploy your applications by triggering a continuous delivery pipeline.

- Webhooks are scoped to a project and can be configured to trigger for specific configs within that project.
- When a webhook is triggered, Doppler sends a POST request to the specified URL.
- A custom JSON payload can optionally be provided; otherwise a default payload including project, config, and workspace details is sent.
- Doppler can optionally sign the webhook events by including a signature in each event's `X-Doppler-Signature` header, allowing you to verify that the events were sent by Doppler. Signing uses HMAC-SHA256 with a user-provided secret.
- Webhooks can be enabled, disabled, updated, and deleted via the API.
- Authentication options can be configured for the webhook target URL.
