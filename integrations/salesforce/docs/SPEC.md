Now I have enough information to write the specification.

# Slates Specification for Salesforce

## Overview

Salesforce is a cloud-based CRM platform that provides sales, service, marketing, and commerce tools for businesses. It offers a comprehensive suite of APIs (REST, SOAP, Bulk, Metadata, Composite, GraphQL, Pub/Sub) for managing CRM data, automating business processes, and integrating with external systems. The REST API is a web service that provides programmatic access to Salesforce data, uses the REST architectural style, and employs HTTP methods like GET, POST, PUT, and DELETE to access, create, update, or delete records.

## Authentication

Salesforce uses OAuth 2.0 exclusively for API authentication. Salesforce uses the OAuth protocol to allow application users to access data securely without exposing usernames and passwords. Before making API calls, you must register your app as a connected app in Salesforce.

**Prerequisites:**

- A **Connected App** must be created in Salesforce Setup, which provides a **Client ID** (Consumer Key) and **Client Secret** (Consumer Secret).
- Register or configure a connected app in Salesforce to obtain authentication credentials (such as client ID and client secret).

**Token Endpoint:**

- Production: `https://login.salesforce.com/services/oauth2/token`
- Sandbox: `https://test.salesforce.com/services/oauth2/token`
- Custom domain: `https://{your-domain}.my.salesforce.com/services/oauth2/token`

**Authorization Endpoint:**

- `https://login.salesforce.com/services/oauth2/authorize`

**Supported OAuth 2.0 Flows:**

1. **Authorization Code (Web Server) Flow** — For user-facing web applications. The user logs in with their credentials at the endpoint directly, authorises the app, and the browser is redirected to the callback URL. The application extracts the auth code from the return URL and uses it to fetch the access token and refresh token from the token endpoint. PKCE is also supported.

2. **Client Credentials Flow** — For server-to-server connections. Uses `client_id` and `client_secret` to obtain an access token directly. Connect each application to Salesforce using a dedicated integration user.

3. **JWT Bearer Token Flow** — Used for server-to-server integration scenarios. This flow uses a certificate to sign the JWT request and doesn't require explicit user interaction. Requires uploading an X.509 certificate to the connected app. The JWT must include claims for `iss` (client ID), `sub` (Salesforce username), `aud` (login URL), and `exp` (expiration). No refresh token is returned in this flow.

4. **Username-Password Flow** (legacy) — Exchanges username, password, client ID, and client secret directly for an access token. Not recommended for production use.

**OAuth Scopes:**

Key scopes include:

- `api` — Access to REST API, Bulk API, and other data APIs
- `refresh_token` / `offline_access` — Allows obtaining a refresh token
- `full` — Full access to all data accessible by the user (does not include refresh token; must request separately)
- `chatter_api` — Access to Connect REST API resources
- `wave_api` — Access to Analytics REST API
- `openid` — OpenID Connect identifier
- `web` — Access via web browser, includes Visualforce
- `cdp_api` — Access to all Data Cloud API resources
- `pardot_api` — Access to Marketing Cloud Account Engagement (Pardot)
- `custom_permissions` — Access to custom permissions in the org

**Important Details:**

- The token response includes an `instance_url` that identifies the Salesforce instance to which API calls should be sent. All subsequent API calls must be directed to this instance URL.
- Access tokens expire and should be refreshed using the refresh token (where available) or by re-authenticating.

## Features

### CRM Record Management

Create, read, update, and delete (CRUD) standard and custom Salesforce objects such as Accounts, Contacts, Leads, Opportunities, Cases, and any custom objects. The REST API is the relevant solution for linking Salesforce data into web and mobile applications, supporting CRUD operations. Records can also be queried using SOQL (Salesforce Object Query Language) and searched using SOSL (Salesforce Object Search Language).

### Bulk Data Operations

The Bulk API is specifically used to handle massive amounts of data. A business can transfer its client database and handle millions of records in batches. Useful for data migration, mass updates, and large-scale imports/exports. Jobs are processed asynchronously.

### Metadata Management

The Metadata API manages customizations and configurations in the Salesforce environment. Developers can retrieve, deploy, create, update, or delete customization information. This includes managing custom objects, fields, page layouts, workflows, and other org configuration elements.

### SOQL and SOSL Queries

Execute structured queries against Salesforce data using SOQL (for precise record retrieval from specific objects) and SOSL (for full-text search across multiple objects). These can be run through the REST or SOAP APIs.

### Composite Operations

The Composite API allows you to execute multiple subrequests in a single API call. You can group CRUD operations, query requests, and more into a single composite request. This includes sObject Tree for creating nested record hierarchies and sObject Collections for batch record operations.

### Analytics and Reporting

You can access Analytics assets—such as datasets, lenses, and dashboards—programmatically. Send queries directly to the Analytics Platform and access imported datasets. Run existing reports, retrieve report metadata, and work with dashboards.

### Chatter and Collaboration

The Connect REST API integrates social collaboration features into custom applications. It enables interaction with data and functionalities within Salesforce Chatter, including feeds, groups, posts, and comments.

### GraphQL API

Query Salesforce data using GraphQL syntax, which allows fetching exactly the data needed in a single request, including traversing relationships between objects.

### File and Content Management

Upload, download, and manage files, attachments, content documents, and notes associated with Salesforce records.

### Tooling and Development

The Tooling API simplifies how developers manage and optimize their applications, helping automate tasks like managing code, improving performance, and speeding up development.

## Events

Salesforce supports several event-driven mechanisms for real-time data streaming and integration.

### Change Data Capture (CDC)

Salesforce Change Data Capture publishes change events, which represent changes to Salesforce records. Changes include record creation, updates to an existing record, deletion of a record, and undeletion of a record. You select which standard or custom objects to monitor. Change Data Capture sends notifications to subscribers whenever a data change in Salesforce occurs. Notification messages are sent to the event bus to which clients can subscribe using Pub/Sub API or Apex triggers.

- Subscribe to changes for individual objects (e.g., `/data/AccountChangeEvent`) or all changes at once (`/data/ChangeEvents`).
- Salesforce stores change events for up to 3 days, allowing clients to replay missed events.

### Platform Events

You can use Pub/Sub API to send custom notifications with platform events. For example, an app can generate platform event notifications for orders that an order fulfillment service processes. With custom platform events, you can publish and subscribe to custom notifications. You can define the schema of the event data by creating platform event objects and fields. Unlike Change Data Capture, which publishes every record change, Platform Events allow you to include only required fields, apply qualification rules, and fire events only when specific business conditions occur.

- Subscribe via the channel `/event/{EventName}__e`.

### Real-Time Event Monitoring Events

You can subscribe to standard platform events that are defined and published by Salesforce, such as real-time Event Monitoring events, to monitor user- and security-related activity in Salesforce. These cover login events, API events, and other security-related activities.

### Pub/Sub API (Subscription Mechanism)

Pub/Sub API provides a single interface for publishing and subscribing to platform events, including real-time event monitoring events, and change data capture events. Based on gRPC and HTTP/2, it efficiently publishes and delivers binary event messages in the Apache Avro format.

- Flow control lets you specify how many events to receive in a subscribe call based on event processing speed in the client.
- Supports replay from a specific event position to recover missed events.
- Supports 11 programming languages in the client offered by the gRPC API, such as Python, Java, Node, and C++.

### Outbound Messages

Outbound Messages are Salesforce-initiated SOAP posts with built-in retry. Salesforce offers event-driven options—Outbound Messages (SOAP), Platform Events, and Change Data Capture (CDC)—rather than a single generic "webhook" object. Outbound Messages are configured declaratively via Flows or Workflow Rules to send selected field data from a record to an external HTTPS endpoint when a trigger condition is met.

- You select the object, the fields to include, and the endpoint URL.
- Workflow Rules can still fire Outbound Messages in many orgs, but Salesforce is shifting toward Flow for new automation.
- Delivery is at-least-once with automatic retries; the external endpoint must acknowledge receipt.
