# Slates Specification for Airbyte

## Overview

Airbyte is an open-source data integration platform that enables syncing data from various sources (APIs, databases, files) to destinations (data warehouses, lakes, databases). It simplifies the process of data movement, transformation, and synchronization by providing a flexible interface. It offers over 600 pre-built connectors supporting a wide array of data sources and destinations.

## Authentication

Airbyte uses a client credentials flow to authenticate API requests. The process involves two steps: create an application in Airbyte, then use that application to get an access token.

**Creating an Application:**
In Airbyte's UI, navigate to your name > User settings > Applications. Click "Create an application", give it a descriptive name, and submit. Click the icon to expose your client secret. The client_id and client_secret credentials don't expire, but you can delete them at any time.

**Obtaining an Access Token:**
Exchange the `client_id` and `client_secret` for a Bearer token by making a POST request to the token endpoint:

- **Airbyte Cloud:** `POST https://api.airbyte.com/v1/applications/token`
- **Self-Managed:** `POST <YOUR_AIRBYTE_URL>/api/public/v1/applications/token`

The request body uses `grant-type: client_credentials` with your `client_id` and `client_secret`.

The API response provides an access_token which is a Bearer Token valid for 60 minutes. Once your access_token expires, you may make a new request to the applications/token endpoint to get a new token.

**Using the Token:**
Include your workspace ID and access token in requests, passing the token as `authorization: Bearer <YOUR_ACCESS_TOKEN>`.

**Base URLs:**
The base URL depends on whether you're using Airbyte Cloud or self-managing, and which domain you use to access the UI.

- Airbyte Cloud: `https://api.airbyte.com/v1/`
- Self-Managed: `<YOUR_AIRBYTE_URL>/api/public/v1/`

## Features

### Source Management

Create, update, list, and delete data source connectors. Configure source-specific settings and credentials. Supports initiating OAuth flows for sources that require it. Sources can also have OAuth override credentials set at the workspace or organization level.

### Destination Management

Create, update, list, and delete destination connectors (data warehouses, databases, lakes, etc.). Configure destination-specific connection settings and credentials.

### Connection Management

Create and manage connections that link a source to a destination. Connections define which streams to sync, the sync mode (full refresh or incremental), and the sync schedule. Connection settings can be updated including stream configuration and schema handling preferences.

### Sync Job Management

Trigger and run syncs, list jobs by sync type, get job status and details, and cancel running jobs. Jobs can be either sync jobs (moving data) or reset jobs (clearing destination data).

### Workspace Management

Create, update, list, and delete workspaces. Workspaces are the organizational unit for grouping sources, destinations, and connections. OAuth override credentials can be configured per workspace.

### Permissions and Users

Manage permissions with role-based access control. List users within an organization, create and update permissions for users. Permissions are scoped to workspaces or organizations.

### Connector Definitions

Manage source and destination definitions, including listing available connector types, creating custom definitions, and updating existing ones. Also supports declarative source definitions for low-code connector development.

### Stream Properties

Retrieve stream properties for a source, which provides information about available streams and their schemas. Useful for configuring which data streams to include in a connection.

### Tags

Create, list, update, and delete tags that can be used to organize and categorize resources within Airbyte.

### Embedded (Powered by Airbyte)

Build a fully integrated Airbyte Embedded experience by creating connection templates (defining destination configuration) and source templates (choosing which connectors users can access). This enables embedding data movement capabilities into third-party products.

## Events

Airbyte supports outgoing webhook notifications for pipeline monitoring events. Notifications are configured per workspace, and Airbyte can send notifications to an email address, webhook, or both. Webhooks deliver an HTTP POST with a JSON payload to any configured URL.

### Sync Success

Airbyte can notify you when a job has been successfully completed. The payload includes sync statistics such as records emitted/committed, bytes processed, duration, and links to the connection, source, and destination.

### Sync Failure

In case of failures, the notification includes the error message provided by the source or the destination. The payload contains error type, error origin, and partial sync statistics.

### Schema Change (Automatic Updates)

When Airbyte detects that a connection's source schema has changed, it will update the connection and send a notification message. Requires enabling both workspace-level and connection-level schema change notifications.

### Schema Change (Action Required)

Airbyte notifies when it detects a schema change that requires your attention to resolve. These are breaking changes that cannot be auto-applied.

### Sync Disabled Warning

If a sync has been failing for multiple days or many times consecutively, Airbyte will send a warning notification when it detects the trend.

### Sync Disabled

Once the failure count hits a threshold, Airbyte sends a Sync Disabled notification and disables the connection. This notification cannot be disabled.
