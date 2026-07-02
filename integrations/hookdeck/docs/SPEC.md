Now let me check details about Hookdeck's webhook notifications (their own event system) and destination authentication options:# Slates Specification for Hookdeck

## Overview

Hookdeck is an event gateway platform that provides infrastructure for receiving, processing, routing, and delivering webhooks and asynchronous HTTP events. It manages the full lifecycle of external events — from ingestion to delivery to observability, whether receiving webhooks from third-party providers or sending outbound events to external systems. The core primitives are Sources (inbound endpoints), Destinations (outbound targets), and Connections (routing rules between them).

## Authentication

Hookdeck uses **API Key** authentication for its REST API and Publish API.

Your API key is located in your project settings. To include your API key in requests, use either Bearer Token Authentication or Basic Authentication.

**Bearer Token Authentication:**

```
Authorization: Bearer $API_KEY
```

**Basic Authentication:**

```
Authorization: Basic BASE64_API_TOKEN
```

This authentication method applies to Hookdeck REST API endpoints (e.g., `/events`, `/requests`, `/sources`) and Hookdeck Publish API endpoints (`https://hkdk.events/v1/publish`). For authentication when sending requests to a Source URL (e.g., `https://hkdk.events/src_123...`), see Source Authentication — which is a separate mechanism.

The API base URL is `https://api.hookdeck.com/{version}/` where `{version}` is a dated version string (e.g., `2025-07-01`). The API version can be set in the base path of any endpoint. Otherwise the API defaults to the oldest supported version.

There is no OAuth flow or scopes — a single project-level API key grants full access to all API operations within that project.

## Features

### Source Management

A source represents any service that makes an HTTP request to the URL for a source defined within Hookdeck. The HTTP requests can be inbound events such as webhooks or API calls to trigger a workflow defined by a connection. Each source gets a unique Hookdeck URL to receive events. Source Types help you quickly configure sources for specific platforms and services, automatically setting up appropriate configuration including authentication methods, required headers, and response formats.

- Sources can be configured with verification (HMAC, Basic Auth, API Key) for inbound webhook authentication.
- Custom responses can be set for providers that require specific acknowledgment formats.
- You can customize the source URL to use your own custom domain name.

### Destination Management

Represents the destination for an event to be routed to. A destination can be connected to one or many Sources. Destinations are configured with a target HTTP URL and support several authentication methods for outbound requests:

- API Key (custom header or query parameter), Bearer Token (standard Authorization header), and OAuth 2.0 authentication flow.
- Hookdeck signature and custom SHA-256 signature options for destination authentication.
- Configurable delivery rate to control throughput.

### Connection & Event Routing

Connections route an Event from a Source to a Destination, optionally including additional logic through connection Rules. Connections can reuse sources and destinations, allowing one event to be routed to multiple destinations.

- Many-to-many relationships between sources and destinations.
- Fan-out delivery of a single event to multiple destinations.
- Connections can be paused and resumed.

### Event Filtering

Filters allow you to permit and route events conditionally based on the contents of their Headers, Body, Query, or Path.

- Filters utilize JSON, and support matching on any value (string, number, boolean, null), on nested objects, and on arrays.
- Supports operators like `$lte`, `$gte`, `$or`, `$and`, `$in`, etc., for complex matching strategies.
- Useful for routing specific event types to different destinations or excluding unwanted events.

### Event Transformations

Hookdeck allows for arbitrary transformations on request data using JavaScript (ES6). Transformations modify event payloads and headers in transit.

- Can convert data formats between services (e.g., XML to JSON).
- The transformation runtime cannot perform any IO, or access any external resources such as the network or file system.
- Transformations and filters can be executed in any order. You can configure the execution order by dragging them in the UI or ordering them in the rules[] array in the API.

### Retries & Delivery Management

The retries rule lets you configure automatic retries for Events that do not receive a 2XX status code response from your Destination. You can configure the number of automatic retries and the time interval between each Attempt. You can retry for up to a week and 50 delivery Attempts.

- Failed Events can be retried automatically, manually, or in bulk.
- Delivery rate limiting can be configured per destination.
- Connections can be paused during downtime, with events queued for later delivery.

### Publishing Events (Outbound Webhooks)

Whenever an event occurs in your system that needs to be sent as a webhook, you make an HTTP request to the Hookdeck Publish API with a Source identifier and the request headers and body that you want the webhook to contain.

- Publish API endpoint: `https://hkdk.events/v1/publish`
- There is no limit on the number of Sources in your workspace.
- There is no limit on the number of Destinations or Connections in your workspace.

### Observability & Issue Tracking

Hookdeck keeps logs of all Requests, Events, and delivery Attempts, which you can view in the dashboard or query via the API.

- Issues let you track problems in your project. When a problem occurs, an issue is automatically opened per the connection's issue trigger and your team is notified per the project's notification preferences.
- Issues are organized into three types: delivery issues, transformation issues, and backpressure issues.
- Issue triggers can be customized per connection with configurable thresholds.
- Metrics API endpoints provide data on events by issue, queue depth, transformation performance, and pending events timeseries.

### Bookmarks

Bookmarks allow you to store and replay common and edge case requests.

### Request Inspection & Event Management

Events can be viewed, inspected, filtered, sorted, and retried via the API. Custom event views can be saved for quick access to frequently used filter combinations. Events have statuses (Successful, Failed, Pending, Paused) and can be queried by various properties.

## Events

Hookdeck supports webhook notifications that can be sent to a Hookdeck Source when specific events occur within your project.

### Issue Notifications

Notification topics define which event type(s) you want to receive notifications for. You can configure webhook notifications via the API (`PUT /notifications/webhooks`) with the following topics:

- **`issue.opened`** — Triggered when a new issue is automatically opened (delivery failure, transformation failure, or backpressure). When a problem occurs, an issue is automatically opened per the connection's issue trigger and your team is notified.

### Event Delivery Notifications

- **`event.successful`** — Triggered when an event is successfully delivered to a destination, containing the payload of the response from the destination URL. Useful for implementing asynchronous response workflows.

Webhook notifications are delivered to a configurable Hookdeck Source. It is recommended to create a source named "hookdeck" to receive these webhook notifications; delivery of these notifications to various destinations can then be managed by adding destinations to that source.

Notification channels include email, Slack, and webhooks.
