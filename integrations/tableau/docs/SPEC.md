# Tableau Integration Specification

## Overview

This integration uses Tableau's REST API to manage common Tableau Cloud and Tableau Server resources. It focuses on practical content and administration workflows: querying content, exporting views, managing users and groups, managing projects and permissions, monitoring jobs, managing favorites, managing current collections endpoints, and handling custom views and data-driven alerts.

The default REST API version is `3.28`, matching Tableau 2026.1 documentation. Classic endpoints use `/api/{api-version}/sites/{site-luid}`. Current collections CRUD and item endpoints use Tableau's per-resource path under `/api/-/collections`.

## Authentication

The integration signs in to Tableau and stores the returned credentials token, site LUID, user LUID, estimated expiration time, and auth method.

Supported sign-in methods:

- Personal access token (PAT)
- Username and password
- Connected app JWT
- Unified access token JWT by setting `isUat: true`

Tableau credentials tokens expire. Tableau Cloud tokens are documented as valid for 120 minutes, while Tableau Server tokens are typically valid for 240 minutes unless the server setting has changed. The integration records a conservative estimated expiration and can refresh PAT and username/password profiles by signing in again with the stored auth input. Non-refreshable auth methods report a user-facing `ServiceError` if a stored token is already expired.

## Tools

- `get_site_info`: Get current site details.
- `list_workbooks`: List and filter workbooks.
- `manage_workbook`: Get, update, delete, refresh, and tag workbooks.
- `list_datasources`: List and filter published data sources.
- `manage_datasource`: Get, update, delete, and refresh data sources.
- `list_views`: List and filter views.
- `get_view_data`: Export view underlying data as CSV.
- `export_view`: Export a view as CSV, PNG, or PDF.
- `manage_custom_views`: List, get, update, delete, and export custom views.
- `manage_users`: List, get, add, update, and remove site users.
- `manage_groups`: List, create, update, delete groups, and manage group membership.
- `manage_projects`: List, create, update, and delete projects.
- `manage_permissions`: Query, add, and delete permissions for supported Tableau resources.
- `manage_jobs`: List, get, and cancel background jobs.
- `manage_favorites`: List, add, and remove user favorites.
- `manage_flows`: List, get, update, delete, and run flows.
- `manage_collections`: List, get, create, update, delete collections, and add, remove, or list collection items.
- `manage_alerts`: List, get, delete, and manage recipients for data-driven alerts.

## Error Handling

Tool validation failures, auth failures, and upstream Tableau API failures are normalized to `ServiceError` from `@lowerdeck/error`. Upstream failures preserve the HTTP status when Tableau provides one.

## Live E2E

The private live E2E suite lives at `tests/integrations/tableau/tools.e2e.ts`. Stable content IDs can be supplied through `SLATES_E2E_FIXTURES`:

- `workbookId`
- `datasourceId`
- `viewId`
- `userId`
- `groupId`
- `customViewId`
- `collectionItemContentLuid`
- `collectionItemContentType`
- `collectionItemContentName`

The suite creates and deletes its own collection for collection CRUD coverage.
