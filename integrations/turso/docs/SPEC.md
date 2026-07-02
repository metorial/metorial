Now let me check for schema databases and database seeding/branching features:I now have enough information to create a comprehensive specification. Let me compile it.

# Slates Specification for Turso

## Overview

Turso is a distributed SQLite-compatible database platform built on libSQL. It provides a Platform API for programmatically managing organizations, groups, databases, locations, members, and API tokens. Turso is commonly used for multi-tenant architectures where each user or tenant gets their own SQLite database in the cloud.

## Authentication

The Turso API uses API tokens to authenticate requests. You can create and revoke API tokens using the Turso CLI and the Authentication API.

Turso uses Bearer authentication, and requires your API token to be passed with all protected requests in the `Authorization` header:

```
Authorization: Bearer TOKEN
```

**Base URL:** `https://api.turso.tech`

**How to obtain an API token:**

1. Install the Turso CLI and log in with `turso auth login` (authenticates via GitHub in the browser).
2. The Turso CLI will generate a temporary token once you login that expires in one week.
3. Create a long-lived API token that doesn't expire using the Platform API:
   ```
   POST https://api.turso.tech/v1/auth/api-tokens/{tokenName}
   ```
4. The token in the response is never revealed again. Store this somewhere safe, and never share or commit it to source control.

An API token belongs to a user and grants access to any organization you own or are a member of.

**Additional context:** The Platform API can be used with your personal account or with an organization. Most API calls are scoped to an organization slug, which is passed as a path parameter (e.g., `/v1/organizations/{organizationSlug}/databases`).

**Database Tokens (separate from API tokens):** Tokens by default enable full-access to databases, but you can create a read-only token by passing the query string `authorization=read-only`. Database tokens are used to connect to databases via SDKs, not for the Platform API itself.

## Features

### Database Management

Create, list, retrieve, delete, and configure databases within an organization. Turso provides two types of databases: individual and schema databases. An individual database is a standalone database. A schema database is used to control the schema of other databases (Multi-DB Schemas).

- Databases are created within a group and inherit the group's locations.
- Databases can be seeded from an existing database, a database dump URL, or a database file upload.
- Database configuration includes options to block reads, block writes, allow attach, and set size limits.
- You can retrieve database usage statistics (rows read, rows written, storage) and top queries for performance analysis.
- Generate database-specific auth tokens with optional expiration and read-only access.

### Group Management

Groups represent physical machines that host databases in specific regions. Each time you add locations to a group, you create a new machine in a new location with a replica of all databases from the primary.

- Create, list, retrieve, and delete groups.
- Manage groups including adding and removing locations, as well as unarchiving or upgrading group versions.
- Generate group-level auth tokens that grant access to all databases in the group.
- Group tokens can be configured with custom expiration (e.g., `2w1d30m`) and read-only authorization.
- Token rotation is available to invalidate all existing tokens for a group.

### Location Discovery

Fetch all available locations where your database group can be located. You can also find the closest location to the requester.

### Organization Management

Manage your organization, its members and invites.

- List, retrieve, and update organizations.
- View available plans and current subscription details.
- Retrieve invoices and current usage (rows read, rows written, storage).
- Add and remove members with roles (e.g., admin).
- Invite users by email and manage pending invitations.

### API Token Management

Create, validate and revoke API keys that can be used to access the API.

- Tokens are created with a name and returned as JWTs.
- List existing tokens and revoke them by name.
- Validate tokens to check expiration status.

### Audit Logs

Access audit logs to monitor activity within your organization, tracking actions taken by members.

## Events

The provider does not support events. Turso's Platform API does not offer webhooks or event subscription mechanisms for changes to databases, groups, or other resources.
