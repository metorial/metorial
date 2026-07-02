Now let me get some more details on the Developer API resources and the data center base URLs.Now I have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Workato

## Overview

Workato is a cloud-based integration platform as a service (iPaaS) that enables organizations to connect applications, automate workflows, and manage APIs without extensive coding. It offers a Developer API for programmatic management of workspace resources like recipes, connections, jobs, and deployments, as well as an API Platform for building and exposing APIs. The platform supports over 1,000 pre-built connectors to SaaS apps, databases, and on-premises systems.

## Authentication

Workato uses **Bearer Token (API Client Token)** authentication for its Developer API.

**How to authenticate:**

1. Sign in to your Workato workspace with the root email or an account with the Environment admin role (or a custom role with the "API clients" privilege).
2. Navigate to **Workspace admin > API clients**.
3. Create a **Client Role** that defines which API endpoints the client can access.
4. Create an **API Client**, assign it a client role and project scopes.
5. Upon creation, Workato generates a one-time-viewable API token. Store it securely.

**Using the token:**

Include the token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <api_token>
```

**Base URLs** vary by data center:

- United States: `https://www.workato.com/api/`
- Europe: `https://app.eu.workato.com/api/`
- Japan: `https://app.jp.workato.com/api/`
- Singapore: `https://app.sg.workato.com/api/`
- Australia: `https://app.au.workato.com/api/`

**Scoping:** API client access is scoped at two levels — the client role defines which API endpoint categories are accessible (e.g., Recipes, Connections, Jobs), and project scopes define which projects within the workspace the client can interact with.

**Note:** Legacy API key authentication (using `x-user-token` and `x-user-email` headers) has been fully deprecated as of July 2025.

**For the API Platform (exposing APIs built on Workato):** Workato supports additional authentication methods for API consumers including Auth tokens, OAuth 2.0 (Client Credentials grant), JSON Web Tokens (JWT), and OpenID Connect. These are configured per API client/access profile and are relevant when consuming APIs built on the Workato API Platform, not the Developer API itself.

## Features

### Recipe Management

Create, read, update, delete, start, stop, and copy automation recipes programmatically. You can also reset recipe triggers, update connections for stopped recipes, activate polling triggers, and manage recipe versions. Recipe health analysis is available (private beta) to retrieve optimization reports.

### Connection Management

List, create, update, disconnect, and delete connections to third-party applications. Connections represent authenticated links between Workato and external services.

### Job Management

View job execution history for recipes, including aggregated job counts (succeeded, failed) and individual job metadata such as status, timestamps, and error details.

### Project and Folder Organization

Manage the organizational structure of a workspace by creating, updating, and deleting projects and folders. Projects serve as top-level containers for recipes, connections, and other assets.

### Project Deployment and Lifecycle

Build projects and deploy them across environments (development, test, production). Supports a review workflow with the ability to assign reviewers, submit for review, approve, reject, and re-open deployments.

### Recipe Lifecycle Management (Export/Import)

Create export manifests to package workspace assets, export packages based on manifests, and import packages into target folders. Useful for CI/CD workflows and migrating recipes between workspaces.

### API Platform Management

Programmatically manage the API Platform: create and manage API collections, endpoints, API clients, and API keys. Enable or disable endpoints, and configure access profiles with different authentication methods.

### Data Tables

Create and manage structured data tables within Workato. Supports full CRUD operations on both tables and individual records, including querying records with filters and file upload/download capabilities. Record manipulation uses a separate base URL (`https://data-tables.workato.com`).

### Lookup Tables

Manage lookup tables for reference data used in recipes. Supports creating tables, adding/updating/deleting rows, and looking up rows by key values.

### Event Streams (Pub/Sub)

Create and manage event topics for publish/subscribe messaging between recipes and external systems. Publish individual or batch messages to topics and consume messages with cursor-based retrieval. Supports long polling for real-time consumption.

- Event stream public APIs use a separate base URL: `https://event-streams.workato.com`

### Agent Studio (Agentic AI)

Manage AI agents ("Genies"), including creating, updating, starting, and stopping them. Assign skills and knowledge bases to agents, and manage user group access.

### Workspace and Collaborator Management

Invite collaborators to a workspace, manage their roles and project-level privileges, and organize collaborators into groups. Supports environment roles and project roles for granular access control.

### Environment Management

Manage workspace-level configuration including environment properties (key-value pairs), tags for organizing assets, audit log retrieval, and secrets management cache operations.

### Custom Connectors and OAuth Profiles

List custom connectors and generate schemas from JSON/CSV samples. Manage custom OAuth profiles for connector authentication.

### Test Automation

Run test cases for recipes and retrieve test results programmatically.

## Events

Workato does not expose a traditional webhook subscription API for external consumers to subscribe to platform-level events. However, it provides the following event mechanisms:

### Webhook Gateway (Inbound)

Workato can receive inbound webhooks from external systems through its Webhooks connector. Each webhook trigger generates a unique URL that external applications can send HTTP POST requests to. Events received at these URLs trigger recipe executions in real-time. Supports JSON, form-encoded, XML, raw binary, and Unicode text payloads. Webhook signature verification can be configured for security.

### Event Streams (Pub/Sub)

Workato Event Streams provides an event-driven messaging system with topics. External systems can publish messages to topics via the public API and consume messages from topics using cursor-based polling (with long-polling support). This enables decoupled, asynchronous communication between publishers and subscribers with guaranteed and persistent delivery.

- **Publish:** Send individual or batch messages to a named topic.
- **Consume:** Retrieve messages from a topic after a specific message ID or timestamp, with configurable long-polling timeout.
