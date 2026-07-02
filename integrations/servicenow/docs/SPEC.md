# Slates Specification for ServiceNow

## Overview

ServiceNow is a cloud-based platform for IT service management (ITSM), IT operations management (ITOM), and business workflow automation. It helps organizations automate routine tasks, enhancing service delivery and performance. It provides a broad set of APIs that allow for direct integration with other platforms and the automation of workflows, enabling CRUD operations on records, query execution, and third-party system integration.

## Authentication

ServiceNow supports multiple authentication methods for inbound REST API access. Each ServiceNow deployment is accessed via a unique instance URL in the format `https://<instance-name>.service-now.com`.

### Basic Authentication

Basic Authentication consists of a combination of username and password. Credentials are sent as a Base64-encoded `Authorization` header with each request. This is the simplest method but less secure for production use.

### OAuth 2.0

For inbound OAuth, ServiceNow supports the following grant types: Resource Owner Password Credentials (Password) and Authorization Code. The Client Credentials grant type requires the Washington DC release or later and must be explicitly enabled by setting the system property `glide.oauth.inbound.client.credential.grant_type.enabled` to `true`.

**Setup:**

1. In ServiceNow, navigate to System OAuth > Application Registry > New and then select "Create an OAuth API endpoint for external clients."
2. The Client ID and Client Secret will populate when the app is saved.

**Endpoints:**

- Authorization URL: `https://{instance-name}.service-now.com/oauth_auth.do`
- Token URL: `https://{instance-name}.service-now.com/oauth_token.do`

**Scopes:**
When using ServiceNow as an OAuth provider, the default scope is `useraccount`, which grants access to the user's account information and preferences. ServiceNow also supports authentication scopes (via the REST API Auth Scope plugin) to allow admins to limit access of an OAuth client application to specific REST APIs. Custom scopes can be created to restrict access to specific HTTP methods on specific APIs (e.g., read-only access to the Table API).

**Token Lifespans:**
The default access token lifespan is 30 minutes (1,800 seconds). The default refresh token lifespan is 100 days (8,640,000 seconds). Both values are configurable per OAuth application.

**Required Input:** Instance name (subdomain), Client ID, Client Secret, and for Password grant: username and password of a ServiceNow user.

## Features

### Record Management (Table API)

The Table API allows access to ServiceNow records across various tables, such as incidents, changes, or requests, which can be queried, updated, or deleted based on integration requirements. This is the primary API for general-purpose CRUD operations on any ServiceNow table. Complex queries are supported to filter and retrieve specific records, allowing precise control over what data is accessed and synchronized.

### Incident, Problem, and Change Management

ServiceNow provides incident, problem, change, and request management to streamline IT processes. Through the API you can create, update, assign, escalate, and resolve these ITSM records. This includes managing work notes, comments, priorities, states, and assignments.

### Configuration Management Database (CMDB)

The CMDB in ServiceNow is a key component that underpins multiple services. A dedicated CMDB Instance API allows managing Configuration Items (CIs) such as servers, applications, network devices, and their relationships. The CMDB Instance API provides parameters unique to the CMDB, such as "className," for specialized operations and integrates with the Identification and Reconciliation Engine to prevent duplicate records.

### Service Catalog

ServiceNow provides a centralized gateway for IT and business service requests, enabling faster fulfillment. Through the API, you can browse catalog items, submit catalog requests, and track order status.

### Knowledge Management

ServiceNow allows for the creation and sharing of documentation and knowledge bases, improving self-service capabilities. The API enables creating, reading, updating, and searching knowledge articles.

### Attachment Management

The Attachment API supports uploading and querying file attachments associated with any record in ServiceNow.

### Import Sets

The Import Set API is designed to allow data import from other systems into ServiceNow. Data is loaded into a staging table, then transformed and mapped into target tables using transform maps. This is useful for bulk data synchronization.

### Custom (Scripted) REST APIs

ServiceNow allows developers to create custom RESTful APIs using the Scripted REST API feature, which is especially useful for creating specialized integrations that require custom logic or endpoints.

### User and Group Management

The API provides access to user records, group memberships, and role assignments. You can create, update, and query users and groups for identity and access management.

### Workflow and Automation

ServiceNow automates routine business processes to reduce inefficiencies and improve productivity. The API allows triggering and interacting with workflows, flow designer actions, and orchestration.

## Events

ServiceNow does not provide a built-in, first-class webhook subscription mechanism through its API. Instead, outbound event notifications are constructed using a combination of Business Rules and Outbound REST Messages.

### Outbound REST Messages (Business Rule-triggered Webhooks)

ServiceNow allows the use of outbound REST messages (webhooks) to notify other systems when events occur, such as a status change in an incident, making it suitable for real-time updates.

To set up a webhook in ServiceNow, you create an outbound REST message and set up a business rule to trigger it when certain conditions are met.

- **Triggerable events:** You can subscribe to various events such as when a record is created, updated, or deleted, or when a comment or work note is added to a ticket.
- **Scope:** Business rules can be configured on any table (incidents, changes, problems, CIs, etc.) and can filter on any field condition (e.g., priority changes, state transitions, assignment changes).
- **Payload:** The webhook can send data in JSON format to an external system or endpoint. The payload is fully customizable via scripting.
- **Consideration:** This is not a self-service subscription model. Webhook setup requires admin access to configure business rules, event registries, and outbound REST messages within the ServiceNow instance. There is no API to programmatically register webhook subscriptions from an external system.
