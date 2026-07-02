Now let me get more details on the REST API and GraphQL capabilities.Now I have enough information to write the specification.

# Slates Specification for Livesession

## Overview

LiveSession is a product analytics platform focused on session replay, allowing teams to record and replay user sessions on web applications. It provides features including heatmaps, conversion funnels, custom metrics and dashboards, developer tools (console logs, network requests, JS errors), and user segmentation. LiveSession is the first product analytics software with a session replay first approach.

## Authentication

The LiveSession API uses Personal Access Tokens (PAT) for authentication. You can create PAT inside LiveSession settings by following these steps:

1. Click API Tokens from left menu.
2. In the upper-right corner of API Tokens page, click the creation button.
3. Give your token a descriptive name.
4. Select the website you want to access through the REST API.
5. Select the scopes you'd like to grant this token.

All API requests must include the token in an `Authorization` HTTP header:

```
Authorization: Bearer <YOUR_PERSONAL_ACCESS_TOKEN>
```

The API is HTTP-based and is hosted at `https://api.livesession.io/v1`.

**Available scopes:**

| Scope                               | Description                   |
| ----------------------------------- | ----------------------------- |
| `users.sessions:read`               | Read user sessions list       |
| `websites:write`, `websites:read`   | Read and write websites data  |
| `alerts:write`, `alerts:read`       | Read and write alerts data    |
| `webhooks:write`, `webhooks:read`   | Read and write webhooks data  |
| `funnels:write`, `funnels:read`     | Read and write funnels data   |
| `metrics:write`, `metrics:read`     | Read and write metrics data   |
| `dashboard:write`, `dashboard:read` | Read and write dashboard data |

When creating a token, you must select the specific website and scopes the token should have access to. Each token is scoped to a single website.

For webhooks, verification is done via an HMAC-SHA256 signature. Every webhook request incorporates a base64-encoded HMAC-SHA256 signature included in the `LiveSession-Signature` header.

## Features

### Session Data Access

Access and manage session data, events, and user journeys programmatically. The REST API allows listing and retrieving user session data collected by LiveSession, including visitor information, geolocation, custom parameters, and session metadata. This is useful for building custom dashboards or exporting data to third-party systems.

### Funnel Management (GraphQL)

Create, update, delete, and compute conversion funnels via the GraphQL API. Funnels can be defined with multiple steps and filters, computed over flexible date ranges, and marked as favorites. Each funnel step supports a rich filtering system with string, integer, float, boolean, parameter, and custom event property filters.

- Supports relative date ranges (e.g., today, last 7 days, beginning of month) and absolute date ranges.

### Metrics and Dashboards

Read and write custom metrics and dashboard configurations through the API. This allows programmatic management of the analytics dashboards and KPI tracking that LiveSession provides.

### Alerts Management

Create and manage alerts programmatically. Alerts can be configured to trigger on specific session events and can be connected to webhook endpoints for real-time notifications.

### Websites Management

Read and manage website configurations within your LiveSession account. Each website has its own tracking ID and can be configured independently.

### Webhook Management

Programmatically create and manage webhook endpoint configurations. Note that you must have an Admin or Owner role to manage webhook settings.

### Data Export

Export users or events data to CSV or JSON.

## Events

LiveSession supports webhooks that deliver real-time notifications when specific session events occur. Once you've configured your endpoints, you can begin assigning them to specific events using Alerts.

All webhook events are delivered under the `session.event` type with the following sub-categories:

### JavaScript Errors (`JSError`)

Triggers when a JavaScript error occurs during a user session. The payload includes the error message, occurrence count, timestamp, and visitor details (ID, name, email, custom parameters, geolocation).

### Network Errors (`NetError`)

Triggers when a network request error is detected during a session. The payload includes the HTTP method, URL, status code, timestamp, and visitor details.

### Error Clicks (`ErrorClick`)

Triggers when a user clicks on an element that results in an error. The payload includes the error message, timestamp, and visitor details.

### Rage Clicks (`RageClick`)

Triggers when a user performs rapid repeated clicks (indicating frustration). The payload includes the click count, timestamp, and visitor details.

### Custom Events (`Custom`)

Triggers when a custom event is handled. These events are made during recording through the `ls.track('EVENT')` Browser API function. The payload includes the event name, custom properties (with typed values based on key suffixes like `_str`, `_int`, `_bool`), timestamp, and visitor details.
