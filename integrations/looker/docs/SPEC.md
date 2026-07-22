# Slates Specification for Looker

## Overview

Looker is a Google Cloud business intelligence and data analytics platform that uses LookML, a modeling language, to define data relationships and enable flexible analytics. It provides a REST API (currently API 4.0) that exposes nearly all platform functionality, including running queries, managing dashboards and content, administering users, scheduling data deliveries, and embedding analytics into applications.

## Authentication

The integration authenticates with Looker API3 client credentials. The
instance URL is required in the authentication input — production
authentication runs without access to provider configuration, so the auth
input is the authoritative login URL. The `instanceUrl` in the provider
settings is used by tool invocations and must point to the same instance; if
both values are present during authentication, they must normalize to the same
URL or authentication is rejected.

Instance URLs are trimmed, required to use HTTPS, and normalized to avoid
duplicating a trailing `/api/4.0` path. Explicit ports and proxy path prefixes
are preserved. Credentials are sent as an `application/x-www-form-urlencoded`
body to `POST /api/4.0/login`, never in the URL.

Each new login stores the access token, its expiry, and the normalized instance
binding. Expiring tokens are refreshed automatically by exchanging the stored
API3 credentials again. The authenticated profile is loaded from
`GET /api/4.0/user`.

Before credentials, tokens, or tool requests are sent, the integration checks
that the current instance still matches the stored normalized binding. Changing
the host or other normalized URL components requires reauthentication. Token
refresh and profile lookups fall back to the stored instance binding when
neither provider configuration nor an auth-input URL is available. Older
stored auth without an instance binding remains compatible; during
authentication, when both provider configuration and auth input are available,
strict normalized URL matching still applies.

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
