# Slates Specification for Bitwarden

## Overview

Bitwarden is an open-source password manager and secrets management platform. It provides a Public API for organization-level administration (members, groups, collections, policies, event logs) and a Secrets Manager product for storing and deploying developer secrets like API keys and database credentials. Bitwarden can be used as a cloud-hosted service or self-hosted on your own infrastructure.

## Authentication

Bitwarden uses **OAuth2 Client Credentials** flow to authenticate with the Public API.

### Organization API Key (Public API)

The API uses bearer access tokens to authenticate with protected API endpoints. Bitwarden uses an OAuth2 Client Credentials application request flow to grant bearer access tokens.

To obtain a bearer token, make a POST request to the identity endpoint:

- **Cloud (US):** `https://identity.bitwarden.com/connect/token`
- **Cloud (EU):** `https://identity.bitwarden.eu/connect/token`
- **Self-hosted:** `https://your.domain.com/identity/connect/token`

Request parameters (form-encoded):

- `grant_type`: `client_credentials`
- `scope`: `api.organization`
- `client_id`: Your organization client ID (format: `organization.ClientId`)
- `client_secret`: Your organization client secret

The API Key `client_id` and `client_secret` can be obtained by an organization owner from the Admin Console by navigating to Settings → Organization info and scrolling down to the API key section.

The access token is valid for 60 minutes after being issued. The organization API key enables full access to your organization.

The Public API is available for all Enterprise and Teams organizations.

### Secrets Manager Access Token

The Secrets Manager CLI can be logged in to using an access token generated for a particular machine account. This means that only secrets and projects which the machine account has access to may be interacted with. Access tokens are generated per machine account in the Secrets Manager web app and authenticate via the `BWS_ACCESS_TOKEN` environment variable or passed directly.

### Important Distinctions

The personal API key is not the same as the organization API key used to access the Bitwarden Public API or Directory Connector. Personal API keys have a `client_id` with format `user.clientId`, while organization API keys have a `client_id` with format `organization.ClientId`.

## Features

### Organization Member Management

Manage the members of your Bitwarden organization. The Public API provides tools for managing members, collections, groups, event logs, and policies. You can invite, list, update, and remove members, as well as assign them to groups and collections. Members can be confirmed, reinstated, or have their access revoked. Each member can be assigned roles and have an external ID for directory synchronization.

### Group Management

Create and manage groups within an organization. Groups can be assigned to collections with specific permission levels (read-only, hide passwords, manage). Groups help organize members and simplify permission assignment at scale.

### Collection Management

Manage collections, which are organizational structures for grouping vault items. Collections can be assigned to groups or individual members with configurable access levels (read-only, hide passwords, manage).

### Organization Policies

Configure organization-wide policies that control how Bitwarden is used. Policies can enforce behaviors like requiring two-step login, setting master password requirements, restricting vault exports, and more. Available for Enterprise organizations.

### Event Logs

Track your organization's activity and investigate incidents with event logs, timestamped records that capture changes and usage across your Teams or Enterprise organization. Bitwarden records over 60 event types, covering user actions (login, password changes, 2FA changes), vault item operations (create, edit, delete), collection and group changes, organization settings modifications, and Secrets Manager operations. Events can be queried by date range and exported as JSON. Event log data is retained indefinitely, but you can only view up to 367 days at a time.

### Secrets Management

Bitwarden Secrets Manager enables developers, DevOps, and cybersecurity teams to centrally store, manage, and deploy secrets at scale. Through the Secrets Manager SDK and CLI, you can:

- Authenticate using an access token, retrieve a single secret or all secrets in a project, and list all secrets, secrets in a project, or projects.
- Create, update, and delete secrets (key-value pairs with optional notes).
- Organize secrets into projects with granular access control.
- Assign machine accounts with read or read-write access to specific projects.

The Public API does not allow for management of individual vault items.

### SCIM Provisioning

Bitwarden servers provide a SCIM endpoint that, with a valid SCIM API Key, will accept requests from your identity provider (IdP) for user and group provisioning and de-provisioning. Bitwarden organizations offer SCIM integrations with Azure AD, Okta, OneLogin, and JumpCloud. SCIM enables automatic user and group syncing from your identity provider to Bitwarden. SCIM integrations are available for Teams and Enterprise organizations.

## Events

The provider does not support webhooks or event subscriptions as a built-in public-facing feature. Event logs can be accessed through the web app and the `/events` endpoint of the Bitwarden Public API, but this is a polling-based query mechanism rather than a push-based event system. There are no native outgoing webhooks or event subscription mechanisms available through the Public API for external consumers.
