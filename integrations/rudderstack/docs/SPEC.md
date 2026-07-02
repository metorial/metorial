# Slates Specification for RudderStack

## Overview

RudderStack is a customer data platform (CDP) that collects, routes, and processes event data from websites, apps, and servers to over 200 downstream destinations including data warehouses, analytics tools, and marketing platforms. It is an open-source Customer Data Platform designed for developers, providing data pipelines for seamless collection and routing of customer data, supporting real-time data streaming to over 180 business tools and scheduled data loading to warehouses or data lakes. It also offers Reverse ETL capabilities to sync data from warehouses back to business tools.

## Authentication

RudderStack uses two primary authentication mechanisms depending on the API being accessed:

### 1. Basic Authentication (HTTP API, Transformations API, Tracking Plan API, Test API)

RudderStack uses Basic Authentication for authenticating all HTTP requests. There are two variations:

- **For the Event/HTTP API (Data Plane):** Every request must be authenticated using Basic Authentication where the username is the source write key and the password should be an empty string. The base URL is your **Data Plane URL**, which varies by plan (provided in the dashboard for cloud plans, or self-hosted for open source).

  Example header: `Authorization: Basic {Base64Encoded(<SOURCE_WRITE_KEY>:)}`

- **For Management APIs (Control Plane):** such as Transformations, Tracking Plans, Test API, and Data Catalog APIs. The API is authenticated via HTTP Basic Authentication with an empty string as the username and your Service Access Token (SAT) or Personal Access Token (PAT) as the password.

  Example header: `Authorization: Basic {Base64Encoded(:<SERVICE_ACCESS_TOKEN>)}`

  The base URL for these APIs is `https://api.rudderstack.com`.

### 2. Bearer Authentication (Audit Logs API, User Suppression API, Data Governance API, Profiles API, Activation API)

The Audit Logs API uses Bearer authentication. The User Suppression API uses Bearer Authentication in the format `Authorization: Bearer <SERVICE_ACCESS_TOKEN>`. The Profiles and Activation APIs also use Bearer authentication.

Example header: `Authorization: Bearer <SERVICE_ACCESS_TOKEN>`

### Token Types

A Service Access Token (SAT) enables applications access to RudderStack APIs, providing a flexible, secure, and centralized way to programmatically interact with resources. Unlike Personal Access Tokens which are tied to individual users, SATs provide centralized access to resources within an Organization or Workspace, ensuring continuity when members are removed or their roles change.

- **Service Access Tokens (SATs):** For production use cases that require shared access to the services and resources across the organization or workspace. Can be scoped to organization-level or workspace-level. Roles include Admin, Editor, or Viewer.
- **Personal Access Tokens (PATs):** For testing a service/feature or personal use cases. Tied to an individual user account and inherit the user's role permissions.

### Regional Base URLs

RudderStack supports regional deployments (US and EU). The API base URL and Data Plane URL may differ depending on your region.

## Features

### Event Tracking (HTTP API)

Send customer event data programmatically to RudderStack using standard call types: **identify** (associate users with traits), **track** (record user actions), **page** (record page views), **screen** (record screen views), **group** (associate users with groups), and **alias** (merge user identities). You can import historical data by adding the timestamp argument to API calls, though this only works for destinations that accept historical time-stamped data. Events can also be sent in batches.

### Transformations Management

RudderStack's Transformations API allows you to create, read, update and delete transformations and libraries programmatically. Transformations are custom JavaScript or Python functions that modify event payloads in-flight before they reach destinations. You can also create reusable **Libraries** of shared functions. Transformations support versioning and can be published or kept as unpublished drafts.

### Tracking Plans

Tracking plans let you proactively monitor and act on non-compliant event data coming into your RudderStack sources based on predefined plans, helping minimize the risk of improperly configured event data breaking downstream systems. They evaluate each incoming event for inconsistencies and automatically flag violations like unplanned events or erroneous key/value properties. Tracking plans can be managed programmatically via the API.

### Data Governance (Event Audit API)

RudderStack's Event Audit API allows you to diagnose inconsistencies in your event data programmatically, giving access to information on all events and their metadata, including event schema, event payload versions, data types, and more. Requires Org Admin role to enable.

### User Suppression and Deletion

The User Suppression API ensures the quality and integrity of data in a secure and compliant manner, allowing you to suppress incoming source data for users and delete collected user data in downstream destinations. Supports two regulation types: **suppress** (stop collecting data) and **suppress_with_delete** (stop collecting and delete existing data from specified destinations). Useful for GDPR/CCPA compliance.

### Data Catalog Management

Manage your tracking plans, events, and properties in your data catalog programmatically. This lets you maintain a centralized view of all event definitions across your organization.

### Reverse ETL Sync Management

Programmatically run syncs for a Reverse ETL connection. RudderStack's Reverse ETL feature lets you use the customer data residing in your data warehouse and route it to your entire data stack. Syncs can be scheduled, triggered via API, or orchestrated through tools like Airflow and Dagster.

### Profiles and Activation API

With RudderStack's Activation API, you can fetch enriched user traits stored in your Redis instance and use them for near real-time personalization. Run your Profiles project programmatically and check its run status. Requires a configured Redis destination and a successful Profiles run.

- This feature is currently in Beta / Early Access.

### Audit Logs

The Audit Logs API lets you programmatically access audit logs for security audits, including accessing all existing logs, logs generated after the last access, and filtering based on workspaces, dates, etc. Tracks actions like CRUD operations on sources, destinations, connections, and transformations.

- Available only in the Enterprise plan.

### Event Testing

The Test API offers endpoints to verify successful event transformation and delivery for a given source-destination setup, without having to refer to the Live Events tab. Allows testing individual destinations or full source pipelines with configurable stages (user transformation, destination transformation, and actual delivery).

### Webhook Source and Destination

RudderStack enables you to add any source that supports a webhook and use it to send events. It receives the data based on the settings made in the source, creates the payload, and routes it to the specified destination. You can also configure webhook destinations to forward processed event data to custom HTTP endpoints.

## Events

RudderStack does not natively provide a webhook or event subscription mechanism to push notifications about platform-level changes (e.g., source/destination updates, sync completions) to external systems.

Webhooks in RudderStack serve as a mechanism to forward SDK-generated events to custom endpoints, and the Webhook Source allows ingesting data from external platforms. However, these are data routing features, not platform event subscription mechanisms.

The provider does not support events in the traditional webhook/event subscription sense for platform-level notifications.
