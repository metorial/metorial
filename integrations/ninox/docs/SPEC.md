# Slates Specification for Ninox

## Overview

Ninox is a low-code database platform that allows users to build custom business applications. It offers Public Cloud, Private Cloud, and On-Premises deployment options. Its REST API enables programmatic access to workspaces (teams), databases, tables, records, files, and views, as well as the ability to execute Ninox scripts remotely.

## Authentication

The Ninox API uses Bearer Tokens (called Personal Access Tokens) to authenticate requests. Tokens are managed in the admin settings of the Ninox web app and must be included in the HTTP Authorization header.

**Obtaining an API Key:**

To obtain an API key: visit ninox.com, click the "Start Ninox" button to open the web app (log in if needed), click the Actions gear icon in the top-right corner, select "Integrations" from the drop-down menu, click the "Generate" button, and copy the API key to your clipboard.

**Usage:**

Include the token as a Bearer token in the `Authorization` header of every request:

```
Authorization: Bearer {accessToken}
```

**Important details:**

- API keys grant read and write access to all of your databases, so keep your tokens secure.
- There are no scopes or granular permissions — a single token provides full access.
- Ninox recommends that API requests be made over HTTPS. In the Public and Private Cloud, HTTP requests are redirected to HTTPS. Requests over plain HTTP that don't follow the redirect will fail.

**Base URLs:**

- Public Cloud: `api.ninox.com/v1`
- Private Cloud / On-Premises: `https://{your-instance}.ninoxdb.de/v1` (or your custom domain)

For On-Premises deployments, the API authorization key is configured in the `server-config.json` file using the `apiAuthorization` property in the format `Bearer {accessToken}`.

## Features

### Team (Workspace) Management

List and retrieve information about teams (workspaces) the authenticated user has access to. Teams are the top-level organizational unit that contain databases.

### Database Management

List and retrieve databases within a team. Retrieving a single database returns its schema, settings (name, icon, color), and configuration.

### Table and Field Introspection

List tables within a database and retrieve their structure, including field definitions (field ID, name, and type). Useful for discovering the data model of a Ninox database programmatically.

### Record Management

Create, read, update, and delete records within tables. Records can be filtered using query parameters with JSON-based filter expressions. Upsert (update/insert) operations are supported for writing multiple records at once. Records from related tables must be retrieved with separate calls, as cross-table joins are not available in a single request.

### Querying and Script Execution

- **Query endpoint:** Execute Ninox query expressions (using Ninox's own query language) against a database to select and filter data. For example, `(select Contact).'First Name'` retrieves first names from a Contact table.
- **Exec endpoint:** Execute complex queries and trigger scripts in the Ninox programming language. This allows running global functions defined in the database and retrieving computed/formula field values that are not returned by standard GET requests.

### File Management

Upload, download, and delete files attached to records. Files can also be shared and unshared via the API, generating or revoking public share links for individual files.

### View Management

Retrieve views defined on tables within a database. Views can be shared via scripting, with support for export formats including PDF, HTML, CSV, XLSX, and JSON. Share links for views can also be created and revoked through the API.

### Change Tracking

Retrieve changes in a database starting with a specified sequence number. Changes can be tracked at the database level, table level, or individual record level, each using a `sinceSq` sequence parameter. The response includes updated records, removed record IDs, file changes, and view changes. This is useful for implementing synchronization workflows.

## Events

Ninox does not natively support webhooks or event subscriptions through its API. There is no built-in mechanism for registering webhook URLs or subscribing to push-based event notifications.

However, Ninox provides "Trigger on create" and "Trigger after update" script fields within table configuration. Users can place custom Ninox script code in these fields to make outbound HTTP calls (e.g., POST to a webhook URL) whenever a record is created or updated. This is a scripting-level mechanism configured inside Ninox itself, not a standard webhook registration API.

For polling-based change detection, the change tracking endpoints (using `sinceSq` sequence numbers) described in the Features section can be used to detect new, updated, or deleted records since a given point in time.
