# Slates Specification for Hex

## Overview

Hex is a collaborative data workspace that allows teams to build notebooks, data apps, and analytics projects using SQL and Python. The Hex public API allows teams to programmatically interact with their Hex workspace — including listing projects, triggering runs of published projects, managing access controls, and configuring data connections.

## Authentication

API requests are authenticated using OAuth 2.0 Bearer Tokens in the header of the HTTP request. The token is always bound to a single Hex user's account and requests are executed as that Hex user.

**Token Types:**

There are two types of tokens users can create: Personal access tokens and Workspace tokens. Tokens are prefixed to indicate their type: `hxtp_` for personal access tokens and `hxtw_` for workspace tokens.

- **Personal Access Tokens:** Mirror the same permissions that a user has within the Hex product. They can be created by anyone with an Editor or higher workspace role. Unlike workspace tokens (which can have no expiration), they must be configured to expire after a fixed duration. Durations may include 7, 30, 60, 90, or 120 days.
- **Workspace Tokens:** If you are creating a token that is used to orchestrate projects across a workspace, consider using a Workspace token so that the token is not scoped to an individual user. When creating a workspace token, admins can specify an expiration that is a fixed duration (one of 7, 30, 60, 90, or 120 days), or no expiry.

**Token Scopes:**

Read projects: The token will work with any API endpoint that only gets information (e.g. ListProjects and GetProjectRuns). Run projects: The token will also work with the RunProjects endpoint. For Users, Groups, Collections, and Data connections: The token can be specified to have read-only or write access (which includes read).

**Base URL:**

For most Hex users, the base URL is `https://app.hex.tech/api/v1`. For single tenant, EU multi tenant, and HIPAA multi tenant customers, replace `app.hex.tech` with your custom URL (e.g. `atreides.hex.tech`, `eu.hex.tech`).

The token is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <token>`.

## Features

### Project Management

Create, list, and retrieve Hex projects. Projects can be filtered by statuses, categories, creator, owner, or collection. You can update a project's status (including endorsements). Admin APIs are available on both the Team and Enterprise plans; certain endpoints are exclusive to the Enterprise plan.

### Project Execution

Trigger runs of published projects programmatically, with optional custom input parameters or saved views. You can monitor run status (PENDING, RUNNING, ERRORED, COMPLETED, KILLED), cancel running executions, and optionally update published app results with latest run output. Notifications can be configured for run completion, delivered to Slack channels, Hex users, or groups.

### Project Sharing & Access Control

Manage sharing permissions for projects at multiple levels: individual users, groups, collections, workspace-wide, and public web. Access levels include NONE, APP_ONLY, CAN_VIEW, CAN_EDIT, and FULL_ACCESS.

### Embedded Analytics

Generate presigned URLs for embedding Hex apps in external applications. Supports custom user attributes, input parameter defaults, display options (theme, padding, headers), export scopes (PDF, CSV), and configurable URL expiration.

### User Management

List workspace users with details including name, role, email, and last login date. Users can be filtered by group membership. Deactivate users from the workspace. If your workspace is using Directory Sync, users and groups will continue to be managed there and not via API.

### Group Management

Create, list, edit, and delete groups. Add or remove users from groups. Groups can be used for project sharing and access control.

### Collection Management

Create, list, edit, and retrieve collections. Collections serve as organizational containers for projects with their own sharing permissions at user, group, and workspace levels.

### Data Connection Management

Create, list, retrieve, and edit data connections to external databases. Supported database types include Athena, BigQuery, Databricks, PostgreSQL, Redshift, and Snowflake. Configure schema filters (include/exclude databases, schemas, and tables), schema refresh schedules, and sharing permissions. Statuses and endorsements can be applied to databases, schemas, and tables within a connection.

### Semantic Model Management

Ingest semantic projects from zip files and update statuses/endorsements on datasets and views within semantic projects. Supports dry-run mode and verbose output for validation.

### Cell Management

List, create, read, update, and delete individual cells within a project's draft version. Currently supports CODE and SQL cell types, including reading and writing source code content. Cells can be positioned at specific locations within the project.

### Guide Management

Create, update, publish, and delete guide drafts. Guides can be synced from external sources (e.g., GitHub). Supports batch publishing of all draft guides or selective publishing by ID.

### Observability

Retrieve queried tables for a given project (Observability API) — available on the Enterprise plan only.

## Events

The provider does not support webhooks or event subscriptions. There is no webhook or purpose-built polling mechanism in the Hex API.
