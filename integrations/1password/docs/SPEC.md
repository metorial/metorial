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

Full programmatic access to 1Password items, including creating, reading, updating, deleting, listing, and sharing information stored in vaults. Supported field types include API Keys, Passwords, Concealed fields, Text fields, Notes, SSH private keys, One-time passwords, URLs, Credit card numbers, Emails, File attachments, Document items, Passkeys, and more. Items can also be archived.

### Item Sharing

Securely share items with anyone, whether or not they have a 1Password account. Creates shareable links with configurable expiration (1 hour to 30 days), optional recipient restrictions by email/domain, and one-time view settings. If you have a 1Password Business account, it will also validate the settings against the item sharing policy set by your account owner or administrator.

### Password Generation

Generate passwords using a PIN, Random, or Memorable password recipe. PIN codes have configurable length. Random passwords can include/exclude digits and symbols with configurable length. Memorable passwords support configurable separators (spaces, hyphens, underscores, periods, commas) and can use full words or random syllables.

### Vault Management

Manage your team's vaults and the permissions groups have in them. Operations include retrieving, creating, updating, deleting, and listing vaults, as well as managing group vault permissions and user vault permissions.

### User and Group Management

Provision users, retrieve users, list users, suspend users, retrieve groups, list groups, create groups, and update group membership.

- These operations typically require desktop app authentication rather than service account authentication.

### File Management

Store and retrieve file attachments and document items in vaults. Files can be attached to items and shared via item sharing links.

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
