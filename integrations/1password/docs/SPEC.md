# Slates Specification for 1Password

## Overview

1Password is a password manager and secrets management platform that stores credentials, API keys, SSH keys, and other sensitive data in encrypted vaults. It provides APIs for programmatic access to vault items, secrets automation for infrastructure, and an Events API for security monitoring and SIEM integration.

## Authentication

1Password offers multiple API surfaces, each with its own authentication mechanism. All use bearer token authentication.

### Service Account Token (SDKs and CLI)

Each service account has a service account token that you can provide as an environment variable for authentication. You can choose which vaults and Environments the service account can access and its permissions in each vault.

- Token is provided via the `OP_SERVICE_ACCOUNT_TOKEN` environment variable.
- The format uses "ops\_" as the token prefix.
- Available permissions: read_items, write_items (requires read_items), share_items (requires read_items). You can also include the ability to create vaults.
- Service account permissions, vault access, and Environment access are immutable. To change them, you must create a new service account.
- Service accounts can't access your built-in Personal, Private, or Employee vault.
- Created via 1Password.com (Developer > Directory) or via 1Password CLI.
- 1Password service accounts are exposed through the 1Password CLI and SDKs, not the Connect REST endpoints used by this integration's item, vault, file, and server tools. Those tools require the Connect Server Token auth method and a Connect server URL.

### Connect Server Token (Connect REST API)

Applications and services get information from 1Password through REST API requests to a Connect server. The requests are authenticated with an access token. Create a new token for each application or service you use.

- Requires deploying a self-hosted 1Password Connect server in your infrastructure.
- Token is provided via the `OP_CONNECT_TOKEN` environment variable, along with `OP_CONNECT_HOST` for the server URL.
- When you create a Connect server access token, you can set the token's expiration time to 30, 90, or 180 days. When the expiration time elapses, 1Password revokes the token.
- You can't edit the vaults a token can access after you create it. If you want to change the vaults a token can access, you must revoke the token and create a new one.

### Events API Bearer Token

Follow these steps to add the integration to your 1Password account and create a bearer JSON web token.

- Created under Integrations > Events Reporting in 1Password.com.
- Choose which events the token can access. The default scope includes all events: sign-in attempts, item usages, and audit events.
- Before you get started, you'll need to sign up for a 1Password Business account.
- The Events API base URL varies by region where the 1Password account is hosted.

## Features

### Secret Resolution

Retrieve individual secret values stored in 1Password using secret reference URIs with the syntax `op://vault/item/field`. Supports resolving single secrets or resolving multiple secrets in bulk. Useful for loading API keys, passwords, and other credentials into applications at runtime without exposing plaintext.

### Item Management

Programmatic access to 1Password Connect vault items, including creating, reading, replacing, patching, deleting, listing, and searching items stored in accessible vaults. Supported field types include passwords, concealed fields, text fields, notes, one-time passwords, URLs, emails, and other Connect item fields. Items can be modified with JSON Patch operations where the Connect API supports them.

### Item Sharing

1Password service accounts and SDKs support item sharing, but the Connect REST API does not expose item sharing. This integration does not currently provide an item sharing tool.

### Password Generation

Generate passwords using a PIN, Random, or Memorable password recipe. PIN codes have configurable length. Random passwords can include/exclude digits and symbols with configurable length. Memorable passwords support configurable separators (spaces, hyphens, underscores, periods, commas) and can use full words or random syllables.

### Vault Management

Retrieve and list vaults accessible to the Connect token. Creating, updating, deleting, and permission management for vaults are service-account/SDK or CLI workflows and are not exposed by this Connect-focused integration.

### User and Group Management

1Password SDKs list user and group capabilities, but these are not exposed through the Connect REST API tools in this integration.

- These operations typically require desktop app authentication rather than service account authentication.

### File Management

List file attachments on items, retrieve file metadata, and download file contents through Slate attachments. Connect exposes existing file attachments but does not provide an upload endpoint.

### Events Reporting

The 1Password Events API allows you to retrieve information about activity in your 1Password Business account and send it to your security information and event management (SIEM) system. Provides three categories of events: audit events (administrative actions), item usage events, and sign-in attempt events. Uses cursor-based polling to fetch events incrementally. Requires a 1Password Business account.

## Events

1Password does not support webhook-based event delivery. It provides a purpose-built polling mechanism through the Events API using cursor-based pagination to incrementally retrieve new events.

### Audit Events

Returns information about actions performed by team members within a 1Password account. Events include when an action was performed and by whom, along with details about the type and object of the action and any other information about the activity. Covers changes to vaults, groups, users, permissions, and other administrative actions.

- Requires a bearer token with the `auditevents` scope.
- Uses a cursor to track position for incremental polling.

### Item Usage Events

Returns information about items in shared vaults that have been modified, accessed, or used. Events include the name and IP address of the user who accessed the item, when the item was accessed, and the vault where the item is stored.

- Requires a bearer token with the `itemusages` scope.
- Uses a cursor to track position for incremental polling.

### Sign-In Attempt Events

Returns information about sign-in attempts. Events include the name and IP address of the user who attempted to sign in to the account, when the attempt was made, and – for failed attempts – the cause of the failure.

- Requires a bearer token with the `signinattempts` scope.
- Uses a cursor to track position for incremental polling.
