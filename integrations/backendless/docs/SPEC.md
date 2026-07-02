# Slates Specification for Backendless

## Overview

Backendless is a Backend-as-a-Service (BaaS) platform that provides backend functionality for mobile and web applications. The platform provides highly scalable backend functionality and supports both built-in general purpose backend services and custom developer-defined API services. Core services include user authentication, data persistence, file storage, messaging, and custom business logic.

## Authentication

Backendless uses **API Key authentication** for all REST API calls.

Every API request requires two credentials:

- **Application ID**: A unique identifier for your Backendless application.
- **REST API Key**: A key specific to the REST API client environment.

All Backendless REST requests use the application ID and the REST API key in the endpoint URL. These values can be found on the main dashboard screen of the Backendless Console under Manage > App Settings.

The API endpoint URL format is:

```
https://api.backendless.com/<application-id>/<rest-api-key>/<api-specific-path>
```

Alternatively, every Backendless application receives a subdomain under the backendless.app domain in the format `xxxx.backendless.app`. When using the subdomain, the format is:

```
https://xxxx.backendless.app/api/<api-specific-path>
```

For authenticated user operations, a `user-token` value returned from the login API must be sent in an HTTP header in subsequent requests to maintain the user session.

**Regional endpoints** exist for different hosting zones:

- North America: `https://api.backendless.com`
- European Union: `https://eu-api.backendless.com`
- South America: `https://api.sa.backendless.com`

## Features

### User Management

Supports user registration, login, logout, and password recovery. Allows managing user properties, relations, and integrating social logins. Also supports anonymous/guest login for providing services to users before they complete full registration. Roles and permissions can be assigned to users to control access to resources.

### Data Persistence (Database)

Manage data with SQL-driven search, relations between tables, and schema/security management. Tables can be created dynamically or pre-defined. Supports CRUD operations, relational data linking, data import/export via CSV, and complex querying with where clauses.

### Real-Time Database

Subscriptions can send notifications when new data is saved, updated, or deleted in the database, working cross-platform. Conditional subscriptions ensure the app only receives relevant data updates.

### File Storage

Provides a secure, scalable file storage system supporting static and dynamic content. Can be used for deploying web applications or storing static content. Supports file upload, download, listing, deletion, and directory management. Custom domains can be mapped to file storage.

### Messaging (Pub/Sub)

Provides publishing and subscription APIs to deliver messages from person to person or individual to groups, with cross-platform support and SQL-driven conditional delivery.

### Push Notifications

The Push Notification API is available through all client SDKs and REST API. Push notifications can also be sent from custom Cloud Code. Supports customizable push templates that can send notifications cross-platform, on a schedule, and to specific users or devices.

### Email

Supports sending emails using pre-defined templates identified by name. Templates can include dynamic "smart text" placeholders that reference fields in the database. Recipients can be specified by explicit addresses or by SQL queries against the Users table.

### Geolocation

Allows adding location awareness to application entities including users, data objects, files, and places of interest. Supports geo-relations with data objects, geofencing, and SQL-driven geo-data search including radius and rectangular area searches.

### Caching

Provides a cross-platform data caching API for temporarily storing data on the server in a highly-efficient, in-memory cache.

### Atomic Counters

Supports server-side atomic counters that can be incremented, decremented, and read in a thread-safe manner. Useful for generating sequential values or tracking counts.

### Hive (Key-Value Store)

Hive is a fast data storage system that uses key-value pairs to organize stored data, capable of processing a large number of requests rapidly.

### Cloud Code (Custom Business Logic)

Three types of Cloud Code are supported: API Services (custom serverless microservices), API Event Handlers (code that runs before/after built-in API calls), and Timers (scheduled logic). Cloud Code can be developed in Java, JavaScript/Node.js, or using the Codeless visual builder.

### Security & Roles

Supports global permissions assigned to system or custom roles, applying to all tables, file directories, geo categories, and messaging channels. Permission assignments at lower levels take priority over global settings.

## Events

Backendless supports **Real-Time Database event listeners** via persistent connections (not traditional webhooks).

### Real-Time Data Events

The Real-Time Database emits events when objects are created, updated, upserted, or deleted, which can be delivered in real-time to application code via listener objects. Supported event types include: create, update, upsert, delete, bulk create, bulk update, bulk upsert, and bulk delete.

- Events are scoped to specific database tables.
- Listeners can include where-clause conditions to filter which changes trigger delivery.

### Real-Time Messaging Events

Real-time pub/sub messaging allows subscribing to messaging channels. Listeners receive messages published to the channel in real-time, supporting cross-platform delivery.

### Cloud Code Event Handlers (Server-Side)

For every API call, Backendless generates "before" and "after" events. The before event fires before the default API logic executes, and the after event fires right after. These are server-side hooks rather than outbound webhooks — they allow injecting custom logic into the API processing chain for data, user, messaging, and file operations.

- Can be scoped to specific tables, channels, or file paths.
- Supports both synchronous (blocking) and asynchronous execution.

Backendless does not provide traditional outbound webhook functionality (HTTP callbacks to external URLs) as a built-in feature.
