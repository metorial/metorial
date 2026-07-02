Now let me check if Neon has any native webhook/event support for their management API (not the database itself):Now I have enough information to write the specification. Neon (the serverless Postgres provider) uses API keys with Bearer token auth, has no native webhook support, and provides a comprehensive management API plus a Data API.

# Slates Specification for Neon

## Overview

Neon is a fully managed serverless PostgreSQL platform that provides features like database branching, autoscaling, and scale-to-zero compute. Its API allows programmatic management of projects, branches, databases, compute endpoints, roles, and consumption metrics. Neon also offers a Data API (currently in beta) for querying databases over HTTP.

## Authentication

Neon uses **API Key (Bearer Token)** authentication for its management API.

- The Neon API uses Bearer Token Authentication.
- The `Authorization: Bearer $NEON_API_KEY` entry in the header specifies your API key. Replace `$NEON_API_KEY` with an actual 64-bit API key.
- Each key is a randomly-generated 64-bit token that you must include when calling Neon API methods. All keys remain valid until deliberately revoked.
- Base URL: `https://console.neon.tech/api/v2`

**API Key Types:**

There are three types of API keys with different scopes:

1. **Personal API Key** — Scope: Accesses all projects that the user who created the key is a member of. Permissions: The key has the same permissions as its owner.
2. **Organization API Key** — Scope: Accesses all projects and resources within an entire organization. Permissions: Has admin-level access across the organization, independent of any single user. It remains valid even if the creator leaves the organization.
3. **Project-scoped API Key** — Scope: Access is strictly limited to a single, specified project. Permissions: Cannot perform organization-level actions (like creating new projects) or delete the project it is scoped to. This is the most secure and limited key type.

You'll need to create your first API key from the Neon Console, where you are already authenticated. You can then use that key to generate new keys from the API.

Example request:

```
curl 'https://console.neon.tech/api/v2/projects' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <your-api-key>'
```

## Features

### Project Management

Create, list, update, delete, and recover Neon projects. Projects are the top-level organizational unit in Neon. You can configure project settings including Postgres version, region, default compute size, autoscaling limits, and suspend timeout. Projects can be transferred between accounts and organizations.

### Branch Management

Databases belong to a branch. If you create a child branch, databases from the parent branch are copied to the child branch. Branches can be created from any point in time within the project's history retention window. You can list, delete, and restore branches. Branch archiving status can also be monitored.

### Database Management

In Neon, a database belongs to a branch, which means that when you create a database, it is created in a branch. You can create, list, update, and delete databases within branches. Each database has an owner role.

### Compute Endpoint Management

Create, configure, restart, and delete compute endpoints. Compute endpoints are the processing instances that connect to your branches. You can configure autoscaling limits (min/max compute units), suspend timeout settings, and create read replicas for scaling read operations.

### Role Management

Create database roles, reset passwords, and manage database access permissions. Roles belong to branches and are copied to child branches upon creation.

### Snapshots and Backups

Create scheduled and on-demand snapshots for backup and restore, and manage snapshots via API for version control.

### Schema Comparison and Data Anonymization

Compare schemas between branches via API and create anonymized copies of production data with masking rules.

### Consumption Metrics and Quotas

Using the Neon API, you can query consumption metrics to track your resource usage on Neon's paid plans. Metrics include compute time, active time, storage, and data transfer. You can set quotas for consumption metrics per project using the quota settings object in the Create project or Update project API. When any configured metric reaches its quota limit, all active computes for that project are automatically suspended.

### Organization Management

Manage organization members and permissions, invite users, update roles, and remove members. Supports listing and managing organization-level API keys.

### Operations Tracking

Many Neon API operations (creating branches, starting computes, etc.) are asynchronous. You can list operations, check their status, and poll for completion before proceeding with dependent requests.

## Events

The provider does not support events. Neon's management API does not offer webhooks or event subscription mechanisms for infrastructure changes. There is no built-in way to receive push notifications when projects, branches, or databases are created, modified, or deleted.
