Let me fetch the OpenAPI spec to get the full list of API resources and the triggers documentation page.Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Budibase

## Overview

Budibase is an open-source low-code platform for building internal business applications. It provides a built-in database (BudibaseDB), connections to external data sources (SQL databases, REST APIs, Google Sheets, etc.), a drag-and-drop UI builder, and an automation engine for backend workflows. Its Public API exposes programmatic access to applications, tables, rows, users, and queries.

## Authentication

The Budibase API requires an API key be specified as a header, specifically the `x-budibase-api-key` header. Each user will have their own API key which can be generated through the Budibase portal, found in the user dropdown menu in the top right corner.

**API Key Authentication:**

- **Header name:** `x-budibase-api-key`
- **Header value:** Your personal API key
- The API key is generated per user through the Budibase portal. The "View API key" option allows generating a new API key (this will invalidate your old API key).
- The API respects the RBAC system fully. Every user can generate an API key for Budibase and it will only allow users with access to resources to utilize the API.

**Base URL:**

- Budibase Cloud: `https://budibase.app/api/public/v1`
- Self-hosted: `https://<your-host>/api/public/v1`
- Ensure that `/api/public/v1` at the end of the URL is maintained, as this is required to access the Public API.

**Additional Context:**

- For self-hosted instances, the base URL should point to wherever the Budibase instance is hosted.
- Some data endpoints also require the `x-budibase-app-id` header to specify which application context the request operates in.

## Features

### Application Management

The Budibase API provides access to applications through a RESTful API. You can create, retrieve, update, delete, and search for applications. Applications can also be published and unpublished programmatically.

- Applications have a development and published state.
- Each application has a unique App ID used to reference it in data-related requests.

### Table Management

The API covers tables as a resource with full CRUD operations as well as the ability to search. You can create, retrieve, update, and delete tables, as well as list and search across tables within an application.

- The Table ID can be found in the address bar of the builder after the URL's `/data/table/` path (e.g., `ta_123a456b789c123d345e678f`).
- Tables belong to a specific application.

### Row (Data) Management

You can create, retrieve, update, delete, and search for rows within a table. This is the primary mechanism for reading and writing data in Budibase applications.

- Rows are scoped to a specific table within an application.
- Search supports filtering, sorting, and bookmark-based navigation.
- Retrieving a single row will return it enriched with full related rows, rather than the squashed "primaryDisplay" format returned by the search endpoint.

### User Management

Full CRUD and search operations on users within the Budibase tenant. You can create, retrieve, update, and delete users programmatically.

- Users can be assigned roles within applications.
- Roles control what data and screens a user can access.

### Query Execution

You can search for and execute pre-configured queries (e.g., REST API queries, SQL queries) that have been set up in the Budibase application builder.

- Queries must first be created in the Budibase builder before they can be executed via the API.
- Query parameters can be passed dynamically at execution time.

## Events

Webhooks allow Budibase to listen for an external application event, and trigger an automation. A payload will be included in the trigger that gives Budibase information about the event.

Budibase supports **inbound webhooks** — external services can POST JSON payloads to a Budibase-generated webhook URL to trigger automations. However, Budibase does not provide outbound webhook subscriptions or event streaming for changes happening within Budibase itself.

### Inbound Webhook Triggers

Each Budibase automation can be configured with a webhook trigger that generates a unique URL. External services send HTTP POST requests with a JSON payload to this URL to initiate the automation.

- The webhook URL is auto-generated per automation and can be copied from the automation builder.
- The incoming JSON payload is accessible within the automation via trigger bindings.
- Any JSON structure can be sent; the automation can reference fields from the payload.

### Row-Based Automation Triggers (Internal Only)

Budibase automations can be triggered whenever table rows are created, deleted, or updated. These are internal triggers and not externally subscribable events. They only fire for changes made through Budibase itself, not for changes made directly in an external database.

**Note:** Budibase does not offer outbound webhooks or event subscriptions that notify external systems when data changes occur inside Budibase. To detect changes externally, one would need to poll the API.
