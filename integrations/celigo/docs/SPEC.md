# Slates Specification for Celigo

## Overview

Celigo (integrator.io) is an integration platform as a service (iPaaS) that enables users to build, manage, and run integration flows between cloud applications. It provides a RESTful API for programmatically managing all platform resources including connections, flows, exports, imports, integrations, and error handling. The platform is deployed in two regions: North America and the EU (Germany).

## Authentication

Celigo uses **Bearer Token** authentication for its REST API.

The integrator.io API is RESTful, performs requests in JSON formatting, and is secured by bearer tokens.

**Generating API Tokens:**

Only an account owner or administrator can create and view an API token. You can view and manage your API tokens in integrator.io under Resources → API tokens.

To generate an API token, see Managing API tokens. You can create a custom API token that only applies to specific APIs or a token that has full access to your Celigo platform account.

**Using API Tokens:**

API clients should transmit this token using the Authorization request header field and the Bearer authentication scheme.

Example:

```
GET /v1/tokenInfo HTTP/1.1
Host: api.integrator.io/v1
Authorization: Bearer my_api_token
```

**Base URLs (region-specific):**

- North America: `https://api.integrator.io/v1/`
- EU: `https://api.eu.integrator.io/v1/`

**Token Types:**

API tokens have two classifications. For custom integrations, users can perform Create, Read, Update, or Delete (CRUD) operations. For integration apps, users can perform Read and Update operations, but tokens are restricted from creating or deleting integration app data. Updates are also limited to specific fields that can only be configured from within the user interface.

You can verify a token by calling the `/v1/tokenInfo` endpoint, which returns the associated user ID and scope.

## Features

### Connection Management

Connections are used to store credentials, along with any other information needed to access the applications you are integrating. The API allows creating, reading, updating, deleting, and testing connections. You can also execute virtual exports and imports against a connection without saving a permanent resource.

### Flow Management

Flows are used to compose exports and imports so that data can be exported out of one or more applications and then imported into one or more applications. Through the API, you can create, update, delete, enable/disable, and invoke flows. Flows can be triggered on a schedule, manually, or via webhook listeners. You can also retrieve flow dependencies and job status information.

### Export and Import Management

Exports are used to extract data from an application. Exports can run standalone via the API, or in the context of a flow. Imports are used to insert data into an application. Imports can run standalone via the API, or in the context of a flow. Both exports and imports can be created, updated, deleted, and invoked directly through the API.

### Integration Management

Integrations serve as organizational containers for flows and connections. The API supports creating, reading, updating, and deleting integrations, as well as registering connections to integrations and creating integration templates (exportable ZIP snapshots).

### Error Management

Error Management enables you to access your flows' errors using the integrator.io API and then take action programmatically. You can retrieve open and resolved errors for specific exports, imports, or integrations. Errors can be retried or resolved via the API, enabling automated error handling workflows.

### User Management

The API provides endpoints for managing users associated with an account, including listing, inviting, and modifying user roles and permissions.

### API Builder

Use the API builder to create APIs with a visual, low-code interface. You can customize your API requests and responses, add new or existing lookups and imports from the Celigo platform, and easily define your business logic. You can also configure transformations, error handling, and mappings and test your API to ensure it works as expected. APIs created in the platform can be invoked externally using token authentication.

### JavaScript APIs (Custom Endpoints)

JavaScript APIs are custom HTTP endpoints built directly in integrator.io, which client applications can invoke. They are simply custom-made endpoints. Usually, integrator.io initiates a transfer between applications; however, with JavaScript API, integrator.io receives a request from an external application to trigger a flow, export, or import.

### State Management

State is an API only resource type that can be used to store arbitrary JSON data (associated with a custom key). Typically the state API is used to persist data about a flow's last execution, and then to use that same data to parameterize the next execution of the flow (i.e. the next time it runs).

### iClient Management

iClients are used (mostly) by SmartConnectors to store the authentication data required to connect with a specific API (on behalf of the SmartConnector). For example, if you are building a SmartConnector for Salesforce you will be required (by Salesforce) to register your app, and Salesforce will provide you with a client id, token, etc... and then you can use an iClient to store this data and also make it available ONLY to your SmartConnector install base.

### Lookup Caches

The API provides endpoints for managing lookup caches, which allow caching of frequently accessed reference data for use in integration flows.

### File Definitions

A file definition instructs integrator.io how to parse an EDI template. This JavaScript object lets you retrieve or modify all file definitions in your account.

## Events

Celigo supports **webhook listeners** that allow flows to be triggered in real-time by external events.

Webhooks send an HTTP POST message over the web in real-time to an endpoint when an event occurs in an application. When an event triggers a webhook request, the source application sends a message to a specified URL, and a webhook listener receives the message and then executes operations according to the message's content.

### Inbound Webhook Listeners

Celigo can receive webhooks from external applications to trigger integration flows in real-time. integrator.io supports webhook technology on source application exports.

- A public URL is automatically generated for each webhook listener.
- Supported verification types include: Basic authentication, HMAC (hash-based message authentication), and Token-based authentication.
- integrator.io has webhook connectors for certain applications. In such cases, select the application itself instead of using the generic webhook item, then click the webhook radio button (instead of API) during configuration.
- Custom success response codes, headers, media types, and body content can be configured.

Note: Celigo does not emit outbound webhook events from its own platform. It acts as a webhook receiver (listener) to trigger flows based on events from connected applications. Monitoring of platform-level changes (e.g., flow errors, connection status) is available only through email notifications and the dashboard UI, not through webhooks or event subscriptions.
