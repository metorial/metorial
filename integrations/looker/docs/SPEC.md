Now let me get the full API reference to see all endpoint categories:Now I have comprehensive information to write the specification.

# Slates Specification for Looker

## Overview

Looker is a Google Cloud business intelligence and data analytics platform that uses LookML, a modeling language, to define data relationships and enable flexible analytics. It provides a REST API (currently API 4.0) that exposes nearly all platform functionality, including running queries, managing dashboards and content, administering users, scheduling data deliveries, and embedding analytics into applications.

## Authentication

Looker supports two primary authentication methods:

### 1. API Key Credentials (Client ID / Client Secret)

The Looker API implements OAuth 2.0's "Resource Owner Password Credentials Grant" pattern. An API key consisting of a `client_id` and `client_secret` is required to log in and use the API. You obtain a short-term OAuth 2.0 access token by calling the `POST /api/4.0/login` endpoint, providing the `client_id` and `client_secret`. You then place that access token in the HTTP Authorization header of subsequent requests.

- **Credentials**: `client_id` and `client_secret` (called "API3 Keys" in Looker)
- **How to obtain**: Created on the Users page in the Admin section of your Looker instance. If you're not a Looker admin, ask your admin to create the API3 credentials for you.
- **Token endpoint**: `POST https://<your-looker-instance>/api/4.0/login` with `client_id` and `client_secret` as form parameters
- **Token lifetime**: Tokens typically expire after one hour, so scripts should handle automatic reauthentication.
- **Usage**: Include `Authorization: token <access_token>` in request headers
- **Custom input required**: The Looker instance base URL (e.g., `https://mycompany.looker.com` or `https://mycompany.cloud.looker.com`). For instances hosted on Google Cloud or Azure, and for AWS instances created on or after 07/07/2020, the default API port is 443. For older AWS instances, it uses port 19999.
- API3 credentials are always bound to a Looker user account. API requests execute "as" the user associated with the credentials. Calls to the API will only return data that the user is allowed to see, and modify only what the user is allowed to modify.
- Multiple sets of API3 credentials can be bound to a single Looker user account.

### 2. OAuth 2.0 (Authorization Code with PKCE, for browser-based apps)

Looker uses OAuth to let OAuth client applications authenticate into the Looker API without exposing client IDs and client secrets to the browser. Authentication using OAuth is available only with the Looker API 4.0.

- OAuth client applications must first be registered with Looker using the API before users of the application can authenticate into Looker.
- The OAuth flow involves redirecting to the Looker UI's `/auth` endpoint, receiving an authorization code, and exchanging it at the `/token` API endpoint.
- This method is primarily used for CORS/browser-based applications and requires the origin be added to Looker's embedded domain allowlist.

### User Impersonation

Backend services can authenticate with API credentials, can use the API with a service account, and can conveniently impersonate API requests on behalf of end users. Looker provides `login_user` (sudo) functionality to make API calls on behalf of specific users using a service account's credentials.

## Features

### Query Execution and Data Retrieval

Run queries against LookML models and retrieve results programmatically. Queries can be defined by specifying a model, view (Explore), fields, filters, sorts, and limits. Results can be returned in multiple formats including JSON, CSV, XLSX, SQL, and PDF. Supports synchronous and asynchronous query execution, inline queries, URL-encoded queries, merge queries (combining multiple queries), and SQL Runner queries for raw SQL execution.

### Dashboard Management

Create, read, update, delete, copy, move, search, and import dashboards. Manage dashboard elements (tiles), filters, layouts, and layout components. Supports both user-defined dashboards and LookML-defined dashboards. Dashboards can be synced from or imported to LookML. Rendering dashboards to images (PNG, PDF) is also supported via render tasks.

### Look Management

Create, read, update, delete, copy, move, and run Looks (saved queries with visualizations). Looks can be searched, executed with different output formats, and organized into folders.

### Folder and Content Organization

Manage the folder hierarchy for organizing Looks, dashboards, and other content. Browse folder children, ancestors, and parent relationships. Manage content metadata and access controls on content items. Search, validate, and favorite content.

### User and Group Administration

Full lifecycle management of users: create, update, delete, search, and manage credentials. Manage user groups with nested group support. Assign users to groups, manage user sessions, and handle password resets. Create service accounts and embed users.

### Role-Based Access Control

Define and manage roles, permission sets, and model sets. Assign roles to users and groups. Enumerate available permissions. Control which data models each role can access.

### Scheduled Plans (Content Delivery)

Create and manage scheduled deliveries of Looks and dashboards. Schedules support recurring delivery via email, webhooks, S3, SFTP, and integration hub destinations. Formats include data tables, visualizations, CSV, PDF, and more. Scheduled plans can also be triggered on-demand.

### Alerts

Create and manage data-driven alerts on dashboard tiles. Users can follow/unfollow alerts, configure alert conditions and thresholds, and define notification destinations. Alerts can be enqueued for immediate evaluation.

### Embedding

Generate signed embed URLs and cookieless embed sessions for embedding Looker content (dashboards, Looks, Explores) into external applications. Manage embed secrets and validate embed URLs. Supports both SSO embed and cookieless embed patterns.

### LookML Project and Git Management

Manage LookML projects, including Git branch operations (create, checkout, delete, merge). Deploy changes to production, validate LookML code, run LookML tests, and manage project files. Supports deploy webhooks for CI/CD workflows and repository credential management.

### Database Connections

Configure and manage database connections, including testing connectivity. Inspect connection metadata: list databases, schemas, tables, and columns. Manage SSH tunnels and servers for secure database access. Supports external OAuth application configuration for database connections.

### Integration and Action Hub

Manage integration hubs (Action Hubs) and their individual integrations/actions. Looker's Action API allows developers to define actions, or custom destinations to which Looker can send query results, dashboard results, or user interactions. Looker supports three types of actions: query, cell, and dashboard. Actions can be used to push data to external services like Slack, Segment, Google Sheets, and custom endpoints.

### Instance Configuration

Manage Looker instance settings including SMTP configuration, private labeling (white-label), cloud storage settings, custom welcome emails, digest emails, locales, timezones, legacy features, and mobile settings.

### Authentication Configuration

Configure LDAP, SAML, OIDC, Google Auth, and password-based authentication for the Looker instance. Test auth configurations before applying. Manage OAuth client applications, session settings, and user login lockouts.

### Themes and Color Collections

Create and manage UI themes and color palettes for customizing the look and feel of the Looker instance and embedded content.

### Derived Tables (PDTs)

View derived table dependency graphs, trigger PDT (Persistent Derived Table) materializations, and monitor build status.

### Rendering

Generate image or PDF renderings of Looks, queries, dashboards, and individual dashboard elements via asynchronous render tasks.

### Artifact Store

Store and retrieve arbitrary key-value artifacts organized by namespace. Useful for storing extension or application state.

### Metadata Exploration

Explore database metadata through connections: list databases, schemas, tables, and columns. Get model field name suggestions and cost estimates for queries.

## Events

Looker does not provide a traditional webhook subscription system where external consumers register to receive event notifications about changes within Looker (e.g., "a dashboard was updated" or "a user was created").

Looker's webhook capabilities are **outbound-only** and limited to the following mechanisms:

### Scheduled Content Delivery via Webhook

Looker allows you to send data using webhooks for the following types of events: Explore results (one-time deliveries), Look results (one-time and recurring deliveries), and Dashboard results (one-time and recurring deliveries). These are outbound data pushes configured as part of Looker's scheduler — they send query/dashboard results to a specified webhook URL on a schedule or on demand, rather than notifying about platform events.

### Deploy Webhooks

A webhook deploy endpoint prompts your Looker instance to deploy changes from a Git branch, a commit SHA, or a tag name, and then push the changes to the production version of your project. This is an inbound webhook that Looker exposes for Git providers to trigger LookML project deployments — it is not an event subscription mechanism.

Beyond these, Looker does not support subscribing to platform events via webhooks or a purpose-built polling mechanism.
